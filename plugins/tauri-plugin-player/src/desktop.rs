use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Player<R>> {
    Ok(Player(app.clone()))
}

#[allow(dead_code)]
pub struct Player<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Player<R> {
    pub fn call(&self, _cmd: &str, _args: Value) -> crate::Result<Value> {
        Err(crate::Error::Msg(
            "The native player only exists on mobile".into(),
        ))
    }
}
