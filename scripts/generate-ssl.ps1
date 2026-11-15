<#
.SYNOPSIS
  Generates self-signed SSL/TLS certificates for local Nginx reverse proxy.
#>
param(
    [string]$CertDir = ".\certs",
    [string]$Domain = "localhost"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $CertDir)) {
    New-Item -ItemType Directory -Path $CertDir -Force | Out-Null
    Write-Host "[INFO] Created certificates directory: $CertDir"
}

$certPath = Join-Path $CertDir "school-api.crt"
$keyPath = Join-Path $CertDir "school-api.key"

if ((Test-Path $certPath) -and (Test-Path $keyPath)) {
    Write-Host "[INFO] SSL Certificates already exist at $certPath and $keyPath"
    exit 0
}

Write-Host "[INFO] Generating self-signed SSL certificate for domain: $Domain"

# Check if openssl is available
if (Get-Command openssl -ErrorAction SilentlyContinue) {
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
        -keyout $keyPath `
        -out $certPath `
        -subj "/CN=$Domain/O=Algions School Management/C=IN"
    Write-Host "[SUCCESS] SSL certificates generated successfully via openssl."
} else {
    # Generate via PowerShell New-SelfSignedCertificate
    $cert = New-SelfSignedCertificate -DnsName $Domain -CertStoreLocation "cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(1)
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    [System.IO.File]::WriteAllBytes($certPath, $certBytes)

    # For development fallback placeholder key
    if (-not (Test-Path $keyPath)) {
        # Export private key or create placeholder for container mounting
        $rsa = [System.Security.Cryptography.RSA]::Create(2048)
        $privateKeyBytes = $rsa.ExportPkcs8PrivateKey()
        $pemKey = "-----BEGIN PRIVATE KEY-----`n" + [System.Convert]::ToBase64String($privateKeyBytes, [System.Base64FormattingOptions]::InsertLineBreaks) + "`n-----END PRIVATE KEY-----"
        Set-Content -Path $keyPath -Value $pemKey
    }
    Write-Host "[SUCCESS] Self-signed certificate created."
}

Write-Host "[INFO] Certificate: $certPath"
Write-Host "[INFO] Private Key: $keyPath"

