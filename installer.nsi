; ══════════════════════════════════════════════════════════════════════
; INZAR TURIZM - SESSIZ KURULUM (NSIS UNICODE SCRIPT)
; ══════════════════════════════════════════════════════════════════════

Unicode true

!define PRODUCT_NAME "Inzar Turizm Umre Platformu"
!define PRODUCT_VERSION "1.0.1"
!define PRODUCT_PUBLISHER "Inzar Turizm"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\Inzar Turizm.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKCU"
!define MAIN_APP_EXE "Inzar Turizm.exe"

; No compression for fast build
SetCompress off

Name "${PRODUCT_NAME} v${PRODUCT_VERSION}"
OutFile "d:\inzartarifehesap\dist-app\Inzar_Turizm_Kurulum_v1.0.1.exe"
InstallDir "$LOCALAPPDATA\Programs\Inzar Turizm"
InstallDirRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails nevershow
ShowUnInstDetails nevershow
RequestExecutionLevel user

; Silent by default
SilentInstall silent
SilentUnInstall silent

; Icon
!include "MUI2.nsh"
!define MUI_ICON "d:\inzartarifehesap\icon.ico"
!define MUI_UNICON "d:\inzartarifehesap\icon.ico"

; Language
!insertmacro MUI_LANGUAGE "Turkish"

; ══════════════════════════════════════════════════════════════════════
; KURULUM BOLUMU
; ══════════════════════════════════════════════════════════════════════
Section "Ana Uygulama" SecMain
  SetOutPath "$INSTDIR"
  SetOverwrite on

  ; Copy all packed files
  File /r "d:\inzartarifehesap\dist-app\Inzar Turizm-win32-x64\*.*"

  ; Create Shortcuts
  CreateDirectory "$SMPROGRAMS\Inzar Turizm"
  CreateShortCut "$SMPROGRAMS\Inzar Turizm\Inzar Turizm.lnk" "$INSTDIR\${MAIN_APP_EXE}" "" "$INSTDIR\${MAIN_APP_EXE}" 0
  CreateShortCut "$SMPROGRAMS\Inzar Turizm\Kaldir.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
  CreateShortCut "$DESKTOP\Inzar Turizm.lnk" "$INSTDIR\${MAIN_APP_EXE}" "" "$INSTDIR\${MAIN_APP_EXE}" 0

  ; Create Uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Registry Keys
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\${MAIN_APP_EXE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\${MAIN_APP_EXE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd

; ══════════════════════════════════════════════════════════════════════
; KALDIRMA BOLUMU
; ══════════════════════════════════════════════════════════════════════
Section Uninstall
  ; Delete Shortcuts
  Delete "$DESKTOP\Inzar Turizm.lnk"
  Delete "$SMPROGRAMS\Inzar Turizm\Inzar Turizm.lnk"
  Delete "$SMPROGRAMS\Inzar Turizm\Kaldir.lnk"
  RMDir "$SMPROGRAMS\Inzar Turizm"

  ; Delete App Folder
  RMDir /r "$INSTDIR"

  ; Delete Registry Keys
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_DIR_REGKEY}"
  SetAutoClose true
SectionEnd
