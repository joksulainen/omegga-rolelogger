# rolelogger

A simple [omegga](https://github.com/brickadia-community/omegga) plugin that logs role events.

Logs can be found in `./logs/roles/` relative to the omegga instance.
Logs include usernames (multiple if players shared display names) to find perpetrators easier.

## Install & update

`omegga install gh:joksulainen/rolelogger`
`omegga update rolelogger`

## Config

All config options configurable in omeggas web UI.

| Config            | Type         | Default | Description |
| ----------------- | ------------ | ------- | ----------- |
| `check_updates`   | `boolean`    | `true`  | When enabled, the plugin checks for updates and notifies of them on init and then every 4 hours. |
| `emphazise_roles` | `list[Role]` | `[]`    | Roles that should be logged with emphasis. Takes precedence over ignore. |
| `ignore_roles`    | `list[Role]` | `[]`    | Roles that shouldn't be logged. |
