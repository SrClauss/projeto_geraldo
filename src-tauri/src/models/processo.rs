use chrono::{DateTime, Utc};
use std::collections::HashMap;
use crate::models::sprint::Sprint;
use crate::models::formula::Formula;
use serde::{Serialize, Deserialize};
use uuid;
use crate::models::auditable::Auditable;


#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Processo {
    pub id: String,
    pub nome: String,
    pub formula: Formula,
    pub status: String,
    pub weight: f64,
    pub sprints: Vec<Sprint>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[allow(dead_code)]
impl Processo {
    pub fn new(nome: String, formula: Formula, status: String, weight: f64) -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();
        Processo { id, nome, formula, status, weight, sprints: Vec::new(), created_at: now, updated_at: now }
    }

    pub fn add_sprint(&mut self, mut sprint: Sprint) {
        sprint.processo_id = self.id.clone();
        self.sprints.push(sprint);
        self.touch();
    }

    pub fn accumulate_divergences(&self) -> HashMap<String, f64> {
        let mut acc: HashMap<String, f64> = HashMap::new();
        for sprint in &self.sprints {
            for item in &sprint.itens {
                let id = item.item.id.clone();
                let divergence = item.divergence();
                let entry = acc.entry(id).or_insert(0.0);
                *entry += divergence;
            }
        }
        acc
    }

    pub fn suggest_next_sprint_targets(&self, remaining_sprints: usize) -> HashMap<String, f64> {
        let mut suggestions: HashMap<String, f64> = HashMap::new();
        if remaining_sprints == 0 {
            return suggestions;
        }
        // total de sprints planejados = já executados + remaining
        let total_sprints = (self.sprints.len() + remaining_sprints) as f64;
        let mut actual_totals: HashMap<String, f64> = HashMap::new();
        for sprint in &self.sprints {
            for item in &sprint.itens {
                let id = item.item.id.clone();
                let actual = item.actual.unwrap_or(0.0);
                *actual_totals.entry(id).or_insert(0.0) += actual;
            }
        }
        for item_formula in &self.formula.itens {
            let id = item_formula.item.id.clone();
            // Interpretação: `item_formula.peso` é o valor POR SPRINT (não uma proporção)
            let per_sprint_expected = item_formula.peso;
            let expected_total = per_sprint_expected * total_sprints;
            let actual_so_far = actual_totals.get(&id).cloned().unwrap_or(0.0);
            let error = expected_total - actual_so_far;

            // O objetivo por sprint base é o próprio `per_sprint_expected`.
            let base_per_sprint = per_sprint_expected;
            let per_sprint_correction = if remaining_sprints > 0 { error / (remaining_sprints as f64) } else { 0.0 };

            let mut suggested_next = base_per_sprint + per_sprint_correction;

            // Protege contra NaN / infinito / desvios extremos
            if !suggested_next.is_finite() {
                suggested_next = 0.0;
            }
            // Clamp para evitar números absurdos
            suggested_next = suggested_next.clamp(-1e12, 1e12);

            suggestions.insert(id, suggested_next);
        }
        suggestions
    }

    pub fn save(&self, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("processos")?;
        let serialized = serde_json::to_vec(self)?;
        tree.insert(self.id.as_bytes(), serialized)?;
        Ok(())
    }

    pub fn delete(id: &str, db: &sled::Db) -> Result<(), Box<dyn std::error::Error>> {
        let tree = db.open_tree("processos")?;
        tree.remove(id.as_bytes())?;
        Ok(())
    }

    pub fn get_all(db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<Processo>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("processos")?;
        let start = page * page_size;
        let mut processos = Vec::new();
        for result in tree.iter().skip(start).take(page_size) {
            let (_key, value) = result?;
            let processo: Processo = serde_json::from_slice(&value)?;
            processos.push(processo);
        }
        Ok(processos)
    }

    pub fn list_by_name(name: &str, db: &sled::Db, page: usize, page_size: usize) -> Result<Vec<Processo>, Box<dyn std::error::Error>> {
        let tree = db.open_tree("processos")?;
        let mut processos = Vec::new();
        let start = page * page_size;
        let name_lower = name.to_lowercase();
        for result in tree.iter().skip(start).take(page_size) {
            let (_k, value) = result?;
            let processo: Processo = serde_json::from_slice(&value)?;
            if processo.nome.to_lowercase().contains(&name_lower) {
                processos.push(processo);
            }
        }
        Ok(processos)
    }

    pub fn update_status(&mut self, new_status: String) {
        self.status = new_status;
        self.touch();
    }
}

impl crate::models::auditable::Auditable for Processo {
    fn touch(&mut self) {
        self.updated_at = Utc::now();
    }

    fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::fornecedor::Fornecedor;
    use crate::models::item::Item;
    use crate::models::user::{User, Role};
    use crate::models::sprint::{Sprint, SprintItem};

    #[test]
    fn test_suggest_next_sprint_targets_per_sprint() {
        // cria fórmula com peso por sprint: A=30, B=20
        let mut formula = Formula::new("F".to_string(), vec![]);
        let f = Fornecedor::new("X".to_string());
        let item_a = Item::new("A".to_string(), f.clone());
        let item_b = Item::new("B".to_string(), f.clone());
        formula.add_item_by_weight(item_a.clone(), 30.0);
        formula.add_item_by_weight(item_b.clone(), 20.0);

        // processo com 1 sprint já executado e 1 restante (total_sprints = 2)
        let mut processo = Processo::new("P".to_string(), formula, "ok".to_string(), 0.0);
        let op = User::new("op".to_string(), "pw".to_string(), Role::User);

        let mut si_a = SprintItem::new(item_a.clone(), 30.0);
        si_a.set_actual(31.5);
        let mut si_b = SprintItem::new(item_b.clone(), 20.0);
        si_b.set_actual(19.0);

        let sprint = Sprint::new(processo.id.clone(), 1, vec![si_a, si_b], op);
        processo.add_sprint(sprint);

        let suggestions = processo.suggest_next_sprint_targets(1);
        let a = suggestions.get(&item_a.id).unwrap();
        let b = suggestions.get(&item_b.id).unwrap();
        assert!((*a - 58.5).abs() < 1e-6, "A sugerido {} != 58.5", a);
        assert!((*b - 41.0).abs() < 1e-6, "B sugerido {} != 41.0", b);
    }
}