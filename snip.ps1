#!/usr/bin/env pwsh
# snip.ps1 — PowerShell wrapper
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
node "$root\cli.js" @args
