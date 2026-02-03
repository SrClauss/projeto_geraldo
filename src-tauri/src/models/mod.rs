pub mod fornecedor;
pub mod item;
pub mod formula;
pub mod sprint;
pub mod processo;
pub mod user;
pub mod auditable;

use std::sync::OnceLock;

// Singleton global para garantir apenas uma conexão ao banco
static DB_INSTANCE: OnceLock<sled::Db> = OnceLock::new();

fn init_db() -> sled::Db {
    let db_path = "../geraldo";
    
    // Tenta criar o diretório caso não exista
    let _ = std::fs::create_dir_all(db_path);
    
    // Abre com configuração otimizada para evitar locks desnecessários
    sled::Config::default()
        .path(db_path)
        .cache_capacity(64 * 1024 * 1024) // 64MB cache
        .mode(sled::Mode::HighThroughput)
        .open()
        .unwrap_or_else(|e| {
            eprintln!("failed to open database at {}: {}. Using temporary DB.", db_path, e);
            sled::Config::default()
                .temporary(true)
                .open()
                .expect("failed to open temporary database")
        })
}

pub(crate) fn connect_db() -> &'static sled::Db {
    DB_INSTANCE.get_or_init(init_db)
}

pub(crate) fn create_adm_if_not_exists(db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
    use crate::models::user::User;
    let tree = db.open_tree("users")?;
    let admin_exists = tree.iter().any(|result| {
        if let Ok((_key, value)) = result {
            if let Ok(user) = serde_json::from_slice::<User>(&value) {
                return user.username == "admin";
            }
        }
        false
    });

    if !admin_exists {
        let admin_user = User::new("admin".to_string(), "admin".to_string(), crate::models::user::Role::Admin);
        admin_user.save(db)?;
        println!("Admin user created with username 'admin' and password 'admin'");
    }

    Ok(())
}