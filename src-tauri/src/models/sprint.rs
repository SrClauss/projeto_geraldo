use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use uuid;
use crate::models::auditable::Auditable;
use crate::models::item::Item;
use crate::models::user::User;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SprintItem {
    pub item: Item,
    pub target: f64,
    pub actual: Option<f64>,
}

#[allow(dead_code)]
impl SprintItem {
    pub fn new(item: Item, target: f64) -> Self {
        SprintItem { item, target, actual: None }
    }

    pub fn set_actual(&mut self, actual: f64) {
        self.actual = Some(actual);
    }

    pub fn divergence(&self) -> f64 {
        match self.actual {
            Some(a) => a - self.target,
            None => 0.0,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Sprint {
    pub id: String,
    pub processo_id: String,
    pub numero: usize,
    pub itens: Vec<SprintItem>,
    pub operador_id: User,
    pub comentario: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[allow(dead_code)]
impl Sprint {
    pub fn new(processo_id: String, numero: usize, itens: Vec<SprintItem>, operador_id: User) -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();
        Sprint { id, processo_id, numero, itens, operador_id, comentario: None, created_at: now, updated_at: now }
    }

    pub fn add_item(&mut self, item: SprintItem) {
        self.itens.push(item);
        self.touch();
    }

    pub fn set_actual_for_item(&mut self, item_id: &str, actual: f64) -> bool {
        for it in &mut self.itens {
            if it.item.id == item_id {
                it.set_actual(actual);
                self.touch();
                return true;
            }
        }
        false
    }

    pub fn total_divergence(&self) -> f64 {
        self.itens.iter().map(|i| i.divergence()).sum()
    }

    pub fn apply_suggestions(&mut self, suggestions: &std::collections::HashMap<String, f64>) {
        for item in &mut self.itens {
            if let Some(sugg) = suggestions.get(&item.item.id) {
                item.target = *sugg;
            }
        }
        self.touch();
    }

    pub fn divergence_per_item(&self) -> std::collections::HashMap<String, f64> {
        let mut map = std::collections::HashMap::new();
        for it in &self.itens {
            map.insert(it.item.id.clone(), it.divergence());
        }
        map
    }

    pub fn save(&self, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("sprints")?;
        let serialized = serde_json::to_vec(self)?;
        tree.insert(self.id.as_bytes(), serialized)?;
        Ok(())
    }

    pub fn delete(id: &str, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("sprints")?;
        tree.remove(id.as_bytes())?;
        Ok(())
    }

    pub fn get_all(db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<Sprint>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("sprints")?;
        let start = page * page_size;
        let mut sprints = Vec::new();
        for result in tree.iter().skip(start).take(page_size) {
            let (_key, value) = result?;
            let sprint: Sprint = serde_json::from_slice(&value)?;
            sprints.push(sprint);
        }
        Ok(sprints)
    }

    pub fn list_by_processo(processo_id: &str, db: &sled::Db) -> Result<Vec<Sprint>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("sprints")?;
        let mut sprints = Vec::new();
        for result in tree.iter() {
            let (_, value) = result?;
            let sprint: Sprint = serde_json::from_slice(&value)?;
            if sprint.processo_id == processo_id {
                sprints.push(sprint);
            }
        }
        Ok(sprints)
    }
}

impl crate::models::auditable::Auditable for Sprint {
    fn touch(&mut self) {
        self.updated_at = Utc::now();
    }

    fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}