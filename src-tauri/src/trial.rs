use chrono::{DateTime, Utc, Duration};
use std::fs;
use std::path::PathBuf;

const TRIAL_DAYS: i64 = 5;
const LICENSE_FILE: &str = ".license";

pub fn check_trial() -> Result<(), String> {
    let license_path = get_license_path();
    
    // Se está em modo debug, não verifica trial
    if cfg!(debug_assertions) {
        return Ok(());
    }
    
    // Verifica se arquivo de licença existe
    if !license_path.exists() {
        // Primeira execução - cria arquivo com data de instalação
        let install_date = Utc::now();
        let license_data = format!("{}", install_date.timestamp());
        fs::write(&license_path, license_data)
            .map_err(|e| format!("Erro ao criar arquivo de licença: {}", e))?;
        return Ok(());
    }
    
    // Lê data de instalação
    let install_timestamp = fs::read_to_string(&license_path)
        .map_err(|e| format!("Erro ao ler licença: {}", e))?
        .trim()
        .parse::<i64>()
        .map_err(|e| format!("Licença corrompida: {}", e))?;
    
    let install_date = DateTime::from_timestamp(install_timestamp, 0)
        .ok_or("Data de instalação inválida")?;
    
    let expiry_date = install_date + Duration::days(TRIAL_DAYS);
    let now = Utc::now();
    
    if now > expiry_date {
        let days_expired = (now - expiry_date).num_days();
        return Err(format!(
            "⚠️ PERÍODO DE AVALIAÇÃO EXPIRADO\n\n\
            Seu período de teste de {} dias expirou há {} dia(s).\n\n\
            Data de instalação: {}\n\
            Data de expiração: {}\n\n\
            Entre em contato para adquirir uma licença completa.",
            TRIAL_DAYS,
            days_expired,
            install_date.format("%d/%m/%Y"),
            expiry_date.format("%d/%m/%Y")
        ));
    }
    
    Ok(())
}

pub fn get_trial_info() -> Result<(i64, String), String> {
    let license_path = get_license_path();
    
    if cfg!(debug_assertions) {
        return Ok((999, "Modo Desenvolvimento - Sem Limite".to_string()));
    }
    
    if !license_path.exists() {
        return Ok((TRIAL_DAYS, "Trial não iniciado".to_string()));
    }
    
    let install_timestamp = fs::read_to_string(&license_path)
        .map_err(|e| format!("Erro ao ler licença: {}", e))?
        .trim()
        .parse::<i64>()
        .map_err(|_| "Licença corrompida".to_string())?;
    
    let install_date = DateTime::from_timestamp(install_timestamp, 0)
        .ok_or("Data inválida")?;
    
    let expiry_date = install_date + Duration::days(TRIAL_DAYS);
    let now = Utc::now();
    let days_remaining = (expiry_date - now).num_days();
    
    if days_remaining < 0 {
        Ok((0, format!("Expirado há {} dia(s)", -days_remaining)))
    } else {
        Ok((days_remaining, format!("Expira em {}", expiry_date.format("%d/%m/%Y"))))
    }
}

fn get_license_path() -> PathBuf {
    // Tenta usar APPDATA no Windows
    if let Ok(appdata) = std::env::var("APPDATA") {
        let app_dir = PathBuf::from(appdata).join("geraldo");
        std::fs::create_dir_all(&app_dir).ok();
        return app_dir.join(LICENSE_FILE);
    }
    
    // Fallback para diretório local
    if let Some(data_dir) = dirs::data_local_dir() {
        let app_dir = data_dir.join("geraldo");
        std::fs::create_dir_all(&app_dir).ok();
        return app_dir.join(LICENSE_FILE);
    }
    
    // Último fallback - diretório atual
    PathBuf::from(LICENSE_FILE)
}
