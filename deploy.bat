@echo off
chcp 65001 >nul
rem Chay tu ban sao trong TEMP: buoc cat tam/chuyen nhanh duoc phep thay chinh file nay ma khong lam cmd doc lech.
if defined FIN2_DEPLOY_COPY goto :main
set "FIN2_DEPLOY_COPY=1"
set "FIN2_DIR=%~dp0"
copy /y "%~f0" "%TEMP%\fin2-deploy.bat" >nul || goto :main
"%TEMP%\fin2-deploy.bat" %*
:main
set "FIN2_HERE=%FIN2_DIR%"
set "FIN2_DEPLOY_COPY="
set "FIN2_DIR="
setlocal
rem ============================================================
rem  Deploy Fin2 len Firebase (Hosting + Firestore rules + Functions).
rem  Cach dung: bam dup file nay, hoac go "deploy.bat" (hoac "deploy.bat main").
rem  Nhanh mac dinh: main-1isfwa. Sau khi PR #1 duoc gop thi doi thanh main.
rem ============================================================
set "BRANCH=main-1isfwa"
if not "%~1"=="" set "BRANCH=%~1"
set "PROJECT=fin2-danh-muc"
cd /d "%FIN2_HERE%" || goto :fail

where git >nul 2>nul || (echo [LỖI] Máy chưa cài git. & goto :fail)
where firebase >nul 2>nul || (echo [LỖI] Máy chưa cài Firebase CLI. Cài bằng lệnh: npm install -g firebase-tools & goto :fail)

rem --- 1. Thay đổi chưa commit (kể cả file mới git chưa theo dõi): hỏi trước khi cất tạm ---
set "DIRTY="
for /f "delims=" %%i in ('git status --porcelain') do set "DIRTY=1"
if defined DIRTY goto :dirty
goto :sync

:dirty
echo.
echo Thư mục đang có thay đổi chưa commit:
git status --short
echo.
choice /c YN /m "Cất tạm các thay đổi này (git stash) để tiếp tục deploy"
if errorlevel 2 goto :cancel
git stash push -u -m "deploy.bat cat tam" || goto :fail
echo Đã cất tạm. Xem lại bằng: git stash list

rem --- 2. Lấy đúng code trên GitHub ---
:sync
echo.
echo === Lấy code nhánh %BRANCH% từ GitHub ===
git fetch origin %BRANCH% || goto :fail
git checkout %BRANCH% || goto :fail
git pull --ff-only origin %BRANCH% || goto :fail

rem --- 3. Kiểm tra nhanh (chỉ chạy khi máy đã cài thư viện cho functions) ---
if not exist "functions\node_modules" goto :confirm
echo.
echo === Kiểm tra nhanh bot sàng lọc ===
pushd functions
call npm run smoke
if errorlevel 1 (popd & goto :fail)
popd

rem --- 4. Xác nhận rồi deploy ---
:confirm
echo.
echo Sắp deploy bản:
git log -1 --format="  %%h  %%s"
echo Lên project: %PROJECT%
echo.
choice /c YN /m "Deploy ngay"
if errorlevel 2 goto :cancel
echo.
call firebase deploy --project %PROJECT%
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo  XONG. Deploy thành công.
echo  Mở app, bấm nút lấy giá chung để chấm điểm theo bản mới.
echo ============================================================
pause
exit /b 0

:cancel
echo.
echo Đã huỷ, chưa deploy gì.
pause
exit /b 1

:fail
echo.
echo ============================================================
echo  DỪNG. Deploy CHƯA xong.
echo  Chụp hoặc copy toàn bộ thông báo phía trên gửi cho Claude.
echo ============================================================
pause
exit /b 1
