param(
  [Parameter(Mandatory=$true)][string]$Output,
  [ValidateRange(10,1800)][int]$Seconds=180,
  [ValidateRange(1000,10000)][int]$IntervalMs=1000,
  [int]$TestPostgresPid=0,
  [int]$PrivatePostgresPid=0
)
# Read-only host observation. Never changes processes, affinity, services or disks.
# Raw samples belong in ignored local storage, not in the repository history.
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$target=[IO.Path]::GetFullPath($Output)
$allowed=[IO.Path]::GetFullPath((Join-Path $root 'infra/local'))+[IO.Path]::DirectorySeparatorChar
if (!$target.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase)) { throw 'Use ignored infra/local output' }
if (Test-Path -LiteralPath $target) { throw 'Output exists; preserve previous samples' }
function Delta32($current,$previous) {
  $delta=[double]$current-[double]$previous
  if ($delta -lt 0) { $delta+=4294967296 }
  return $delta
}
$writer=[IO.StreamWriter]::new($target,$false,[Text.UTF8Encoding]::new($false))
$watch=[Diagnostics.Stopwatch]::StartNew()
$previousDisks=@{}; $previousProcesses=@{}; $next=0
try {
  while ($watch.Elapsed.TotalSeconds -lt $Seconds) {
    $began=[DateTime]::UtcNow; $sampleStart=$watch.Elapsed.TotalMilliseconds
    $cpu=@(Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor | Select-Object Name,PercentProcessorTime)
    $memory=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory
    $system=Get-CimInstance Win32_PerfFormattedData_PerfOS_System
    $rawDisks=@(Get-CimInstance Win32_PerfRawData_PerfDisk_PhysicalDisk)
    $rawProcesses=@(Get-CimInstance Win32_PerfRawData_PerfProc_Process)
    $disks=@(foreach ($disk in $rawDisks) {
      if ($disk.Name -eq '_Total') { continue }
      $old=$previousDisks[$disk.Name]; $readMs=$null; $writeMs=$null; $reads=$null; $writes=$null
      if ($old) {
        $elapsed=([double]$disk.Timestamp_PerfTime-[double]$old.Timestamp_PerfTime)/$disk.Frequency_PerfTime
        $readCount=Delta32 $disk.AvgDisksecPerRead_Base $old.AvgDisksecPerRead_Base
        $writeCount=Delta32 $disk.AvgDisksecPerWrite_Base $old.AvgDisksecPerWrite_Base
        if ($readCount -gt 0) { $readMs=1000*(Delta32 $disk.AvgDisksecPerRead $old.AvgDisksecPerRead)/$disk.Frequency_PerfTime/$readCount }
        if ($writeCount -gt 0) { $writeMs=1000*(Delta32 $disk.AvgDisksecPerWrite $old.AvgDisksecPerWrite)/$disk.Frequency_PerfTime/$writeCount }
        if ($elapsed -gt 0) { $reads=$readCount/$elapsed; $writes=$writeCount/$elapsed }
      }
      $previousDisks[$disk.Name]=$disk
      @{disk=$disk.Name; readMs=$readMs; writeMs=$writeMs; readsPerSec=$reads; writesPerSec=$writes; queue=[double]$disk.CurrentDiskQueueLength}
    })
    $groups=@{}; $nodes=@(); $currentProcesses=@{}
    foreach ($proc in $rawProcesses) {
      if ($proc.Name -in @('_Total','Idle')) { continue }
      $id=[int]$proc.IDProcess; $parent=[int]$proc.CreatingProcessID
      $kind=if ($proc.Name -match '^postgres' -and ($id -eq $TestPostgresPid -or $parent -eq $TestPostgresPid)) {'testPostgres'}
        elseif ($proc.Name -match '^postgres' -and ($id -eq $PrivatePostgresPid -or $parent -eq $PrivatePostgresPid)) {'privatePostgres'}
        elseif ($proc.Name -match '^node(#|$)') {'node'}
        elseif ($proc.Name -match '^(opera|chrome|msedge)(#|$)') {'browser'}
        elseif ($proc.Name -match '^(codex|powershell|pwsh|WmiPrvSE)') {'observerAndTools'}
        else {'other'}
      $old=$previousProcesses[$id]; $cores=0.0
      if ($old -and $old.Name -eq $proc.Name) {
        $elapsed=[double]$proc.Timestamp_Sys100NS-[double]$old.Timestamp_Sys100NS
        if ($elapsed -gt 0) { $cores=[Math]::Max(0.0,([double]$proc.PercentProcessorTime-[double]$old.PercentProcessorTime)/$elapsed) }
      }
      $currentProcesses[$id]=$proc
      if (!$groups.ContainsKey($kind)) { $groups[$kind]=@{cores=0.0; privateWorkingSetMiB=0.0; committedMiB=0.0; processes=0} }
      $group=$groups[$kind]; $group.cores+=$cores; $group.privateWorkingSetMiB+=$proc.WorkingSetPrivate/1MB; $group.committedMiB+=$proc.PrivateBytes/1MB; $group.processes++
      if ($kind -eq 'node') { $nodes+=@{pid=$id; cores=$cores; privateWorkingSetMiB=$proc.WorkingSetPrivate/1MB} }
    }
    $previousProcesses=$currentProcesses
    $sample=@{
      fromUtc=$began.ToString('o'); toUtc=[DateTime]::UtcNow.ToString('o'); acquisitionMs=$watch.Elapsed.TotalMilliseconds-$sampleStart
      cpu=$cpu; processorQueue=[int]$system.ProcessorQueueLength
      memory=@{availableMiB=[int]$memory.AvailableMBytes; committedPercent=[int]$memory.PercentCommittedBytesInUse; pagesInputPerSec=[double]$memory.PagesInputPersec; pagesOutputPerSec=[double]$memory.PagesOutputPersec; pageReadsPerSec=[double]$memory.PageReadsPersec}
      disks=$disks; groups=$groups; nodes=$nodes
    }
    $writer.WriteLine(($sample | ConvertTo-Json -Depth 7 -Compress)); $writer.Flush()
    $next+=$IntervalMs
    if ($next -lt $watch.Elapsed.TotalMilliseconds) { $next=$watch.Elapsed.TotalMilliseconds }
    $pause=[int][Math]::Max(0,$next-$watch.Elapsed.TotalMilliseconds)
    if ($pause -gt 0) { Start-Sleep -Milliseconds $pause }
  }
} finally { $writer.Dispose() }
