use chrono::{DateTime, Utc};

#[allow(dead_code)]
pub trait Auditable {
    /// Atualiza o timestamp de `updated_at` para `Utc::now()`.
    fn touch(&mut self);

    /// Retorna o updated_at. Útil para testes ou logs.
    fn updated_at(&self) -> DateTime<Utc>;
}
