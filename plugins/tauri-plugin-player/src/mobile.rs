use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Player<R>> {
    let handle = api.register_android_plugin("com.plugin.player", "PlayerPlugin")?;
    Ok(Player(handle))
}

pub struct Player<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Player<R> {
    pub fn call(&self, cmd: &str, args: Value) -> crate::Result<Value> {
        self.0.run_mobile_plugin(cmd, args).map_err(Into::into)
    }
}
