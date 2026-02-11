!macro customInit
  ; Prevent "gymflow cannot be closed" by force-closing lingering app processes.
  ; Ignore failures because these processes may not exist on every machine.
  nsExec::ExecToLog 'taskkill /F /T /IM "gymflow.exe"'
  nsExec::ExecToLog 'taskkill /F /T /IM "GymFlow.exe"'
  nsExec::ExecToLog 'taskkill /F /T /IM "Uninstall gymflow.exe"'
  Sleep 1200
!macroend
