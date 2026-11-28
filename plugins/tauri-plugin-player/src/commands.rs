use serde_json::{json, Value};
use tauri::{command, AppHandle, Runtime};

use crate::{Error, PlayerExt, Result};

#[command]
pub(crate) async fn call<R: Runtime>(app: AppHandle<R>, cmd: String, args: Option<Value>) -> Result<Value> {
  tauri::async_runtime::spawn_blocking(move || app.player().call(&cmd, args.unwrap_or_else(|| json!({}))))
    .await
    .map_err(|e| Error::Msg(e.to_string()))?
}