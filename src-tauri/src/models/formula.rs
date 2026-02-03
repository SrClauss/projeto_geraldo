use serde::{Serialize, Deserialize};
use uuid;
use crate::models::item::Item;
use chrono::{DateTime, Utc};
use crate::models::auditable::Auditable; 



#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ItemFormula{
    pub item: Item,
    pub peso: f64,
}


impl ItemFormula {
    pub fn new(item: Item, peso: f64) -> Self {
        ItemFormula { item, peso }
    }
}




#[derive(Serialize, Deserialize, Debug, Clone)]

pub struct ItemProporcao {
    pub item: Item,
    pub proporcao: f64,
}


#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Formula {
    pub id: String,
    pub nome: String,
    pub itens: Vec<ItemFormula>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[allow(dead_code)]
impl Formula {
    pub fn new(nome: String, itens: Vec<Item>) -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();
        let itens = itens.into_iter().map(|item| ItemFormula::new(item, 0.0)).collect();
        Formula { id, nome, itens, created_at: now, updated_at: now }
    }

    pub fn save(&self, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("formulas")?;
        let serialized = serde_json::to_vec(self)?;
        tree.insert(self.id.as_bytes(), serialized)?;
        Ok(())
    }

    pub fn update(&mut self, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        self.touch();
        let tree = db.open_tree("formulas")?;
        let serialized = serde_json::to_vec(self)?;
        tree.insert(self.id.as_bytes(), serialized)?;
        Ok(())
    }

    pub fn delete(id: &str, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("formulas")?;
        tree.remove(id.as_bytes())?;
        Ok(())
    }

    pub fn get_all_paginated(db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<Formula>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("formulas")?;
        let mut formulas = Vec::new();
        let start = page * page_size;
        for result in tree.iter().skip(start).take(page_size) {
            let (_k, value) = result?;
            let formula: Formula = serde_json::from_slice(&value)?;
            formulas.push(formula);
        }
        Ok(formulas)
    }
    pub fn list_by_name(name: &str, db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<Formula>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("formulas")?;
        let mut formulas = Vec::new();
        let start = page * page_size;
        let name_lower = name.to_lowercase();
        for result in tree.iter().skip(start).take(page_size) {
            let (_k, value) = result?;
            let formula: Formula = serde_json::from_slice(&value)?;
            if formula.nome.to_lowercase().contains(&name_lower) {
                formulas.push(formula);
            }
        }
        Ok(formulas)
    }
    pub fn add_item_by_weight(&mut self, item: Item, peso: f64) {
        self.itens.push(ItemFormula::new(item, peso));
    }


    pub fn add_itens_by_proportion(&mut self, itens: Vec<Item>, proporcoes: Vec<f64>) {
        let total_proporcao: f64 = proporcoes.iter().sum();
        for (item, proporcao) in itens.into_iter().zip(proporcoes.into_iter()) {
            let peso = proporcao / total_proporcao;
            self.itens.push(ItemFormula::new(item, peso));
        }

      
    }


    pub fn get_proportions(&self) -> Vec<ItemProporcao> {
        let total_peso: f64 = self.itens.iter().map(|item_formula| item_formula.peso).sum();
        self.itens.iter().map(|item_formula| {
            let proporcao = if total_peso > 0.0 {
                item_formula.peso / total_peso
            } else {
                0.0
            };
            ItemProporcao {
                item: item_formula.item.clone(),
                proporcao,
            }
        }).collect()    

    }

    pub fn get_proportion(&self, item_id: &str) -> Option<f64> {
        let total_peso: f64 = self.itens.iter().map(|item_formula| item_formula.peso).sum();
        for item_formula in &self.itens {
            if item_formula.item.id == item_id {
                if total_peso > 0.0 {
                    return Some(item_formula.peso / total_peso);
                } else {
                    return Some(0.0);
                }
            }
        }
        None
    }



    

}

impl crate::models::auditable::Auditable for Formula {
    fn touch(&mut self) {
        self.updated_at = Utc::now();
    }

    fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}