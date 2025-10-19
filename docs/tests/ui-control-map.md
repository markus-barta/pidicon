<!-- PIDICON UI control matrix -->

# PIDICON UI Control Matrix

The entries below define the selectors used by automated UI tests.

| View    | Control               | Selector                                          | Notes                                 |
| ------- | --------------------- | ------------------------------------------------- | ------------------------------------- |
| Devices | Device card           | `data-test="device-card"` (with `data-device-ip`) | Container for each device             |
| Devices | Driver button (Real)  | `data-test="device-driver-real"`                  | Confirm dialog shown before switching |
| Devices | Driver button (Mock)  | `data-test="device-driver-mock"`                  |                                       |
| Devices | Brightness slider     | `data-test="brightness-slider"`                   | Adjust device brightness (0-100)      |
| Devices | Scene selector        | `data-test="scene-selector"`                      | Lists available scenes                |
| Header  | Nav button – Devices  | `data-test="nav-devices"`                         | Switches to devices view              |
| Header  | Nav button – Settings | `data-test="nav-settings"`                        | Switches to settings view             |
| Header  | Daemon restart button | `data-test="daemon-restart"`                      | Calls `/api/daemon/restart`           |
| Footer  | Dev scenes toggle     | `data-test="dev-scenes-toggle"`                   | Shows/hides dev scenes                |

- Add selectors for play/pause/stop buttons, logging dropdown, settings fields, etc., as they are covered.
- Update this file whenever selectors change.
