use serde::{Serialize, Deserialize};
use uuid;
use chrono::{DateTime, Utc};
use crate::models::auditable::Auditable;



#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Role {
    Admin,
    User,
}


#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub hashed_password: String,
    pub role: Role,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}



#[allow(dead_code)]
impl User {
    pub fn new(username: String, hashed_password: String, role: Role) -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();
        User { id, username, hashed_password, role, created_at: now, updated_at: now }
    }

    pub fn save(&self, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("users")?;
        let serialized = serde_json::to_vec(self)?;
        tree.insert(self.id.as_bytes(), serialized)?;
        Ok(())
    }

    pub fn update(&mut self, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
       // atualização que atualiza usuário e sprints associados

        self.touch();

        let users_tree = db.open_tree("users")?;
        let sprints_tree = db.open_tree("sprints")?;

        let serialized = serde_json::to_vec(self)?;
        users_tree.insert(self.id.as_bytes(), serialized)?;

        for result in sprints_tree.iter() {
            let (key, value) = result?;
            let mut sprint: crate::models::sprint::Sprint = serde_json::from_slice(&value)?;
            if sprint.operador_id.id == self.id {
                sprint.operador_id = self.clone();
                sprint.touch();
                let serialized_sprint = serde_json::to_vec(&sprint)?;
                sprints_tree.insert(key, serialized_sprint)?;
            }
        }

        Ok(())
    }

    pub fn delete(id: &str, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("users")?;
        tree.remove(id.as_bytes())?;
        Ok(())
    }

    pub fn get_all(db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<User>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("users")?;
        let start = page * page_size;
        let _end = start + page_size;
        let mut users = Vec::new();
        for result in tree.iter().skip(start).take(page_size) {
            let (_key, value) = result?;
            let user: User = serde_json::from_slice(&value)?;
            users.push(user);
        }
        Ok(users)
    }

    pub fn list_by_name(name: &str, db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<User>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("users")?;
        let mut users = Vec::new();
        let start = page * page_size;
        let name_lower = name.to_lowercase();
        for result in tree.iter().skip(start).take(page_size) {
            let (_k, value) = result?;
            let user: User = serde_json::from_slice(&value)?;
            if user.username.to_lowercase().contains(&name_lower) {
                users.push(user);
            }
        }
        Ok(users)
    }
}

impl crate::models::auditable::Auditable for User {
    fn touch(&mut self) {
        self.updated_at = Utc::now();
    }

    fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}