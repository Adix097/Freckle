use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Player;
#[cfg(mobile)]
use mobile::Player;

pub trait PlayerExt<R: Runtime> {
    fn player(&self) -> &Player<R>;
}

impl<R: Runtime, T: Manager<R>> PlayerExt<R> for T {
    fn player(&self) -> &Player<R> {
        self.state::<Player<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("player")
        .invoke_handler(tauri::generate_handler![commands::call])
        .setup(|app, api| {
            #[cfg(mobile)]
            let player = mobile::init(app, api)?;
            #[cfg(desktop)]
            let player = desktop::init(app, api)?;
            app.manage(player);
            Ok(())
        })
        .build()
}
