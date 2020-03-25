
[CmdletBinding()]
param(
    [String[]]$Path,
    [String]$Filter,
    [String[]]$Include,
    [String[]]$Exclude,
    [bool]$Recurse = $True,
    [bool]$Follow = $False,
    [int]$Top,
    [int]$Bottom,
    [String]$OutputFormat = "table"
)

$GitFileObjectCollection = @()


If ($Follow) {
    $followFlag = "--follow"
}
Else {
    $followFlag = ""
}


Get-ChildItem -Path $Path -Filter $Filter -Include $Include -Exclude $Exclude -Recurse:$Recurse -File | 
Sort-Object -Property FullName -Unique | 
ForEach-Object -Process {
    $GitFileObject = New-Object -TypeName psobject
    Add-Member -InputObject $GitFileObject -MemberType NoteProperty -Name Path -Value ""
    Add-Member -InputObject $GitFileObject -MemberType NoteProperty -Name CommitCount -Value 1
    $GitFileObject.Path = $_.FullName;
    $GitFileObject.CommitCount = (((git log --oneline $followFlag -- $_.FullName) | Out-String) -split "`n").count;
    $GitFileObjectCollection += $GitFileObject;

}

$GitFileObjectCollection = $GitFileObjectCollection | Sort-Object -Property CommitCount -Descending

If ( -Not $null -eq $PSBoundeters) {
    If ($PSBoundeters.ContainsKey('Top')) {
        $Output = $GitFileObjectCollection | Select-Object -First $Top 
    }
    elseIf ($PSBoundeters.ContainsKey('Bottom')) {
    
        $Output =$GitFileObjectCollection | Select-Object -Last $Bottom 
    }
    else {
        $Output =$GitFileObjectCollection
    } 
}
else {
    $Output = $GitFileObjectCollection
}
if ( $Output -eq "json") {
    Write-Host "::set-output name=leaderboard::"($Output | Format-Table)
} else {
    Write-Host "::set-output name=leaderboard::"($Output | ConvertTo-Json)
}