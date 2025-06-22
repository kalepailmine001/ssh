# Use Windows Server Core as the base image
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Set environment variables
ENV PHP_VERSION=8.2.12
ENV PHP_URL=https://windows.php.net/downloads/releases/php-8.2.12-Win32-vs16-x64.zip
ENV PHP_DIR=C:\php

# Download and extract PHP
RUN powershell -Command `
    Invoke-WebRequest -Uri $Env:PHP_URL -OutFile php.zip ; `
    Expand-Archive -Path php.zip -DestinationPath C:\ ; `
    Rename-Item -Path C:\php-*-x64 -NewName php ; `
    Remove-Item php.zip

# Add PHP to PATH
ENV PATH="$Env:PHP_DIR;$Env:PATH"

# Default command
CMD ["php", "-v"]
