# Zet zinnen om in wav-bestanden met een Windows-stem (OneCore, bv. Frank nl-NL).
# Invoer op stdin: per regel "<pad naar wav><TAB><zin>". Per regel komt er precies
# één regel terug: "ok" of "error <melding>". Gebruikt door tts.ts.
param([string]$Language = "nl-NL")

Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

function Await($operation, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
  $task.Wait()
  $task.Result
}

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices |
  Where-Object { $_.Language -eq $Language } | Select-Object -First 1
if (-not $voice) {
  [Console]::Error.WriteLine("Geen Windows-stem voor $Language.")
  exit 2
}
$synth.Voice = $voice

[Console]::InputEncoding = [System.Text.Encoding]::UTF8
while ($null -ne ($line = [Console]::In.ReadLine())) {
  try {
    $path, $text = $line -split "`t", 2
    $stream = Await ($synth.SynthesizeTextToStreamAsync($text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
    $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
    [void](Await ($reader.LoadAsync([uint32]$stream.Size)) ([uint32]))
    $bytes = New-Object byte[] ([int]$stream.Size)
    $reader.ReadBytes($bytes)
    [System.IO.File]::WriteAllBytes($path, $bytes)
    [Console]::Out.WriteLine("ok")
  } catch {
    [Console]::Out.WriteLine("error $($_.Exception.Message -replace '\s+', ' ')")
  }
}
