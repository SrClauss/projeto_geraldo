use serde::{Serialize, Deserialize};
use uuid;
use crate::models::fornecedor::Fornecedor;
use crate::models::auditable::Auditable;
use  chrono::{DateTime, Utc};
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Item {
    pub id: String,
    pub nome: String,
    pub fornecedor: Fornecedor,
    pub fornecedor_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

}




#[allow(dead_code)]
impl Item {
    pub fn new(nome: String, fornecedor: Fornecedor) -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        let fornecedor_id = fornecedor.id.clone();
        let now = Utc::now();
        Item { id, nome, fornecedor, fornecedor_id, created_at: now, updated_at: now }
    }

    pub fn save(&self, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("itens")?;
        let serialized = serde_json::to_vec(self)?;
        tree.insert(self.id.as_bytes(), serialized)?;
        Ok(())
    }
    pub fn update(&mut self, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        // atualiza timestamp do próprio item e persiste
        self.touch();
        let tree = db.open_tree("itens")?;
        let serialized = serde_json::to_vec(self)?;
        tree.insert(self.id.as_bytes(), serialized)?;

        // Atualiza todas as fórmulas que usam este item, preservando o peso
        let formula_tree = db.open_tree("formulas")?;
        for result in formula_tree.iter() {
            let (key, value) = result?;
            let mut formula: crate::models::formula::Formula = serde_json::from_slice(&value)?;
            let mut updated = false;
            for item_formula in &mut formula.itens {
                if item_formula.item.id == self.id {
                    item_formula.item = self.clone();
                    updated = true;
                }
            }
            if updated {
                // marca atualização na fórmula antes de persistir
                formula.touch();
                let serialized_formula = serde_json::to_vec(&formula)?;
                formula_tree.insert(key, serialized_formula)?;
            }
        }

        Ok(())
    }

    pub fn delete(id: &str, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("itens")?;
        tree.remove(id.as_bytes())?;
        Ok(())
    }

    pub fn get_all(db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<Item>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("itens")?;
        let mut itens = Vec::new();
        let start = page * page_size;
        for result in tree.iter().skip(start).take(page_size) {
            let (_k, value) = result?;
            let item: Item = serde_json::from_slice(&value)?;
            itens.push(item);
        }
        Ok(itens)
    }
    pub fn list_by_name(name: &str, db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<Item>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("itens")?;
        let mut itens = Vec::new();
        let start = page * page_size;
        let name_lower = name.to_lowercase();
        for result in tree.iter().skip(start).take(page_size) {
            let (_k, value) = result?;
            let item: Item = serde_json::from_slice(&value)?;
            if item.nome.to_lowercase().contains(&name_lower) {
                itens.push(item);
            }
        }
        Ok(itens)
    }
    
        pub fn list_by_fornecedor(fornecedor_id: &str, db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<Item>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("itens")?;
        let mut itens = Vec::new();
        let start = page * page_size;
        for result in tree.iter().skip(start).take(page_size) {
            let (_k, value) = result?;
            let item: Item = serde_json::from_slice(&value)?;
            if item.fornecedor_id == fornecedor_id {
                itens.push(item);
            }
        }
        Ok(itens)
    }
}


impl Auditable for Item {
    fn touch(&mut self) {
        
        self.updated_at = Utc::now();
   }

    fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

}