mod models;
mod trial;

use models::processo::Processo;
use models::formula::Formula;
use models::fornecedor::Fornecedor;
use models::item::Item;
use crate::models::auditable::Auditable;
use std::collections::HashMap;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[tauri::command]
fn check_trial_status() -> Result<(), String> {
    trial::check_trial()
}

#[tauri::command]
fn get_trial_info() -> Result<(i64, String), String> {
    trial::get_trial_info()
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn list_processos(page: usize, page_size: usize) -> Result<Vec<Processo>, String> {
    let db = models::connect_db();
    Processo::get_all(&db, page, page_size)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_processo(id: String) -> Result<Option<Processo>, String> {
    let db = models::connect_db();
    let tree = db.open_tree("processos").map_err(|e| e.to_string())?;
    match tree.get(id.as_bytes()).map_err(|e| e.to_string())? {
        Some(bytes) => {
            let processo: Processo = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
            Ok(Some(processo))
        }
        None => Ok(None)
    }
}

#[tauri::command]
fn list_formulas(page: usize, page_size: usize) -> Result<Vec<Formula>, String> {
    let db = models::connect_db();
    Formula::get_all_paginated(&db, page, page_size)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_processo(nome: String, formula_id: String) -> Result<models::processo::Processo, String> {
    let db = models::connect_db();
    let tree = db.open_tree("formulas").map_err(|e| e.to_string())?;
    let formula_bytes = tree.get(formula_id.as_bytes()).map_err(|e| e.to_string())?
        .ok_or("Fórmula não encontrada".to_string())?;
    let formula: models::formula::Formula = serde_json::from_slice(&formula_bytes).map_err(|e| e.to_string())?;
    let weight: f64 = formula.itens.iter().map(|it| it.peso).sum();
    let processo = models::processo::Processo::new(nome, formula, "Em Andamento".to_string(), weight);
    processo.save(&db).map_err(|e| e.to_string())?;
    Ok(processo)
}

#[tauri::command]
fn list_fornecedores(page: usize, page_size: usize) -> Result<Vec<Fornecedor>, String> {
    let db = models::connect_db();
    Fornecedor::get_all_paginated(&db, page, page_size)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_itens(page: usize, page_size: usize) -> Result<Vec<Item>, String> {
    let db = models::connect_db();
    Item::get_all(&db, page, page_size)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn search_fornecedores(name: String, page: usize, page_size: usize) -> Result<Vec<Fornecedor>, String> {
    let db = models::connect_db();
    Fornecedor::list_by_name(&name, &db, page, page_size).map_err(|e| e.to_string())
}

#[tauri::command]
fn search_itens(name: String, page: usize, page_size: usize) -> Result<Vec<Item>, String> {
    let db = models::connect_db();
    Item::list_by_name(&name, &db, page, page_size).map_err(|e| e.to_string())
}

#[tauri::command]
fn suggest_sprint_targets(processo_id: String, remaining_sprints: usize) -> Result<HashMap<String, f64>, String> {
    match get_processo(processo_id)? {
        Some(processo) => Ok(processo.suggest_next_sprint_targets(remaining_sprints)),
        None => Err("Processo não encontrado".to_string())
    }
}

#[tauri::command]
fn create_fornecedor(nome: String) -> Result<Fornecedor, String> {
    let db = models::connect_db();
    let f = models::fornecedor::Fornecedor::new(nome);
    f.save(&db).map_err(|e| e.to_string())?;
    Ok(f)
}

#[tauri::command]
fn create_item(nome: String, fornecedor_id: String) -> Result<Item, String> {
    let db = models::connect_db();
    let fornecedores = Fornecedor::get_all_paginated(&db, 0, 1000).map_err(|e| e.to_string())?;
    let fornecedor = fornecedores.into_iter().find(|f| f.id == fornecedor_id).ok_or("Fornecedor não encontrado".to_string())?;
    let item = models::item::Item::new(nome, fornecedor);
    item.save(&db).map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
fn create_formula(nome: String, itens: Vec<(String, f64)>) -> Result<models::formula::Formula, String> {
    let db = models::connect_db();
    // itens: Vec<(item_id, peso)>
    let mut resolved_items: Vec<models::item::Item> = Vec::new();
    for (item_id, _peso) in &itens {
        let items = Item::get_all(&db, 0, 1000).map_err(|e| e.to_string())?;
        let found = items.into_iter().find(|it| it.id == *item_id).ok_or("Item não encontrado".to_string())?;
        resolved_items.push(found);
    }
    let mut formula = models::formula::Formula::new(nome, resolved_items);
    // set pesos
    for (item_id, peso) in itens {
        for itf in &mut formula.itens {
            if itf.item.id == item_id {
                itf.peso = peso;
            }
        }
    }
    formula.save(&db).map_err(|e| e.to_string())?;
    Ok(formula)
}

#[tauri::command]
fn create_user(username: String, password: String, role: String) -> Result<models::user::User, String> {
    let db = models::connect_db();
    let r = match role.to_lowercase().as_str() {
        "admin" => models::user::Role::Admin,
        _ => models::user::Role::User,
    };
    let user = models::user::User::new(username, password, r);
    user.save(&db).map_err(|e| e.to_string())?;
    Ok(user)
}

#[tauri::command]
fn search_formulas(name: String, page: usize, page_size: usize) -> Result<Vec<models::formula::Formula>, String> {
    let db = models::connect_db();
    models::formula::Formula::list_by_name(&name, &db, page, page_size).map_err(|e| e.to_string())
}

#[tauri::command]
fn search_users(name: String, page: usize, page_size: usize) -> Result<Vec<models::user::User>, String> {
    let db = models::connect_db();
    models::user::User::list_by_name(&name, &db, page, page_size).map_err(|e| e.to_string())
}

#[allow(dead_code)]
#[tauri::command]
fn list_users(page: usize, page_size: usize) -> Result<Vec<models::user::User>, String> {
    let db = models::connect_db();
    models::user::User::get_all(&db, page, page_size).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_sprint_for_processo(processo_id: String, remaining_sprints: usize, operador_username: String) -> Result<models::sprint::Sprint, String> {
    let db = models::connect_db();
    
    // Busca processo
    let processo = match get_processo(processo_id.clone())? {
        Some(p) => p,
        None => return Err("Processo não encontrado".to_string())
    };
    
    // Busca operador (por enquanto usa admin, TODO: implementar autenticação)
    let user_tree = db.open_tree("users").map_err(|e| e.to_string())?;
    let operador = user_tree.iter()
        .find_map(|result| {
            if let Ok((_k, v)) = result {
                if let Ok(user) = serde_json::from_slice::<models::user::User>(&v) {
                    if user.username == operador_username {
                        return Some(user);
                    }
                }
            }
            None
        })
        .ok_or("Operador não encontrado".to_string())?;
    
    // Calcula sugestões de peso
    let suggestions = processo.suggest_next_sprint_targets(remaining_sprints);
    
    // Cria sprint items com targets sugeridos
    let sprint_items: Vec<models::sprint::SprintItem> = processo.formula.itens.iter()
        .map(|item_formula| {
            let target = suggestions.get(&item_formula.item.id).cloned().unwrap_or(item_formula.peso);
            models::sprint::SprintItem::new(item_formula.item.clone(), target)
        })
        .collect();
    
    // Cria sprint
    let sprint_numero = processo.sprints.len() + 1;
    let sprint = models::sprint::Sprint::new(processo_id, sprint_numero, sprint_items, operador);
    
    Ok(sprint)
}

#[tauri::command]
fn save_sprint_to_processo(processo_id: String, sprint: models::sprint::Sprint) -> Result<(), String> {
    let db = models::connect_db();
    
    // Busca processo
    let mut processo = match get_processo(processo_id)? {
        Some(p) => p,
        None => return Err("Processo não encontrado".to_string())
    };
    
    // Adiciona sprint ao processo
    processo.add_sprint(sprint);
    
    // Salva processo atualizado
    processo.save(&db).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn finalize_processo(processo_id: String) -> Result<(), String> {
    let db = models::connect_db();
    
    // Busca processo
    let mut processo = match get_processo(processo_id)? {
        Some(p) => p,
        None => return Err("Processo não encontrado".to_string())
    };
    
    // Atualiza status para terminado
    processo.update_status("Terminado".to_string());
    
    // Salva processo
    processo.save(&db).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn delete_processo(processo_id: String) -> Result<(), String> {
    let db = models::connect_db();
    Processo::delete(&processo_id, &db).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_processo_sprints(processo_id: String) -> Result<(), String> {
    let db = models::connect_db();
    let mut processo = match get_processo(processo_id)? {
        Some(p) => p,
        None => return Err("Processo não encontrado".to_string())
    };
    processo.sprints.clear();
    processo.touch();
    processo.save(&db).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // inicializa DB e cria admin se necessário
    let db = crate::models::connect_db();
    if let Err(e) = crate::models::create_adm_if_not_exists(&db) {
        eprintln!("failed to ensure admin user: {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_trial_status,
            get_trial_info,
            greet,
            list_processos,
            get_processo,
            list_formulas,
            list_fornecedores,
            list_itens,
            suggest_sprint_targets,
            create_sprint_for_processo,
            save_sprint_to_processo,
            finalize_processo,
            delete_processo,
            clear_processo_sprints,
            create_fornecedor,
            create_item,
            create_formula,
            create_processo,
            create_user,
            search_fornecedores,
            search_itens,
            search_formulas,
            search_users
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
