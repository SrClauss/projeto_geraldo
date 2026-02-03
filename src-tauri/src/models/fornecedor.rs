use serde::{Serialize, Deserialize};
use uuid;
use crate::models::auditable::Auditable;



#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Fornecedor {
    pub id: String,
    pub nome: String
}

#[allow(dead_code)]
impl Fornecedor {


    pub fn new(nome: String) -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        Fornecedor { id, nome}
    }

    pub fn save(&self, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("fornecedores")?;
        let serialized = serde_json::to_vec(self)?;
        tree.insert(self.id.as_bytes(), serialized)?;
        Ok(())
    }
    pub fn update(&self, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        // Atualiza o fornecedor na árvore de fornecedores
        let tree = db.open_tree("fornecedores")?;
        let serialized = serde_json::to_vec(self)?;
        tree.insert(self.id.as_bytes(), serialized)?;

        // Atualiza todos os itens que usam este fornecedor
        let item_tree = db.open_tree("itens")?;
        for result in item_tree.iter() {
            let (key, value) = result?;
            let mut item: crate::models::item::Item = serde_json::from_slice(&value)?;
            if item.fornecedor.id == self.id {
                item.fornecedor = self.clone();
                // atualiza timestamp do item que teve o fornecedor alterado
                item.touch();
                let serialized_item = serde_json::to_vec(&item)?;
                item_tree.insert(key, serialized_item)?;
            }
        }

        Ok(())
    }


    pub fn delete(id: &str, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("fornecedores")?;
        tree.remove(id.as_bytes())?;
        Ok(())
    }

   pub fn get_all_paginated(db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<Fornecedor>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("fornecedores")?;
        let mut fornecedores = Vec::new();
        let start = page * page_size;
        for result in tree.iter().skip(start).take(page_size) {
            let (_k, value) = result?;
            let fornecedor: Fornecedor = serde_json::from_slice(&value)?;
            fornecedores.push(fornecedor);
        }
        Ok(fornecedores)
    }

    pub fn list_by_name(name: &str, db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<Fornecedor>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("fornecedores")?;
        let mut fornecedores = Vec::new();
        let start = page * page_size;
        let name_lower = name.to_lowercase();
        for result in tree.iter().skip(start).take(page_size) {
            let (_k, value) = result?;
            let fornecedor: Fornecedor = serde_json::from_slice(&value)?;
            if fornecedor.nome.to_lowercase().contains(&name_lower) {
                fornecedores.push(fornecedor);
            }
        }
        Ok(fornecedores)
    }
 
}