use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LocalIdentity {
    local_id: String,
    display_name: String,
    windows_account: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SyncConfig {
    folder_path: Option<String>,
}

fn app_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("App data path could not be resolved: {err}"))?;
    fs::create_dir_all(&dir).map_err(|err| format!("App data path could not be created: {err}"))?;
    Ok(dir)
}

fn identity_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_dir(app)?.join("identity.json"))
}

fn document_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_dir(app)?.join("zue-data.json"))
}

fn sync_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_dir(app)?.join("sync-config.json"))
}

#[tauri::command]
fn load_identity(app: AppHandle) -> Result<Option<LocalIdentity>, String> {
    let path = identity_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(path).map_err(|err| format!("Identity could not be read: {err}"))?;
    serde_json::from_str(&raw).map(Some).map_err(|err| format!("Identity is invalid: {err}"))
}

#[tauri::command]
fn save_identity(app: AppHandle, display_name: String) -> Result<LocalIdentity, String> {
    let existing = load_identity(app.clone())?;
    let identity = LocalIdentity {
        local_id: existing
            .as_ref()
            .map(|identity| identity.local_id.clone())
            .unwrap_or_else(|| Uuid::new_v4().to_string()),
        display_name,
        windows_account: std::env::var("USERNAME")
            .or_else(|_| std::env::var("USER"))
            .ok(),
    };
    let raw = serde_json::to_string_pretty(&identity).map_err(|err| format!("Identity could not be serialized: {err}"))?;
    fs::write(identity_path(&app)?, raw).map_err(|err| format!("Identity could not be written: {err}"))?;
    Ok(identity)
}

#[tauri::command]
fn load_document(app: AppHandle) -> Result<Option<String>, String> {
    let path = document_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(path).map(Some).map_err(|err| format!("Document could not be read: {err}"))
}

#[tauri::command]
fn save_document(app: AppHandle, document_json: String) -> Result<(), String> {
    fs::write(document_path(&app)?, document_json).map_err(|err| format!("Document could not be written: {err}"))
}

#[tauri::command]
fn get_sync_config(app: AppHandle) -> Result<SyncConfig, String> {
    let path = sync_config_path(&app)?;
    if !path.exists() {
        return Ok(SyncConfig { folder_path: None });
    }
    let raw = fs::read_to_string(path).map_err(|err| format!("Sync config could not be read: {err}"))?;
    serde_json::from_str(&raw).map_err(|err| format!("Sync config is invalid: {err}"))
}

#[tauri::command]
fn set_sync_config(app: AppHandle, folder_path: Option<String>) -> Result<SyncConfig, String> {
    if let Some(path) = &folder_path {
        fs::create_dir_all(path).map_err(|err| format!("Sync folder could not be created: {err}"))?;
    }
    let config = SyncConfig { folder_path };
    let raw = serde_json::to_string_pretty(&config).map_err(|err| format!("Sync config could not be serialized: {err}"))?;
    fs::write(sync_config_path(&app)?, raw).map_err(|err| format!("Sync config could not be written: {err}"))?;
    Ok(config)
}

#[tauri::command]
fn sync_pull(app: AppHandle) -> Result<Vec<String>, String> {
    let config = get_sync_config(app)?;
    let Some(folder_path) = config.folder_path else {
        return Ok(Vec::new());
    };
    fs::create_dir_all(&folder_path).map_err(|err| format!("Sync folder could not be created: {err}"))?;
    let mut packages = Vec::new();
    for entry in fs::read_dir(folder_path).map_err(|err| format!("Sync folder could not be read: {err}"))? {
        let entry = entry.map_err(|err| format!("Sync entry could not be read: {err}"))?;
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) == Some("zuechange") {
            packages.push(fs::read_to_string(path).map_err(|err| format!("Sync package could not be read: {err}"))?);
        }
    }
    Ok(packages)
}

#[tauri::command]
fn sync_push(app: AppHandle, change_json: String) -> Result<(), String> {
    let config = get_sync_config(app)?;
    let Some(folder_path) = config.folder_path else {
        return Ok(());
    };
    fs::create_dir_all(&folder_path).map_err(|err| format!("Sync folder could not be created: {err}"))?;
    let file_name = format!("{}.zuechange", Uuid::new_v4());
    fs::write(PathBuf::from(folder_path).join(file_name), change_json)
        .map_err(|err| format!("Sync package could not be written: {err}"))
}

#[tauri::command]
fn print_current_view() -> Result<(), String> {
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_identity,
            save_identity,
            load_document,
            save_document,
            get_sync_config,
            set_sync_config,
            sync_pull,
            sync_push,
            print_current_view
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
