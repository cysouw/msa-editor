try {
	$client = new-object System.Net.WebClient

	$BaseDir = [System.IO.Path]::GetDirectoryName($myInvocation.MyCommand.Definition)

	$JsDir = Join-Path -Path $BaseDir -ChildPath "src\app\js\lib"
	New-Item $JsDir -type directory -force > $null
	Remove-Item $JsDir\* -recurse

	$client.DownloadFile("http://code.jquery.com/jquery-2.1.1.min.js", "$JsDir\jquery-2.1.1.min.js")
	$client.DownloadFile("http://code.jquery.com/ui/1.11.0/jquery-ui.js", "$JsDir\jquery-ui-1.11.0.js")
	$client.DownloadFile("https://raw.githubusercontent.com/eligrey/FileSaver.js/master/FileSaver.js", "$JsDir\FileSaver.js" )
	$client.DownloadFile("https://raw.githubusercontent.com/ArthurClemens/Javascript-Undo-Manager/master/lib/undomanager.js", "$JsDir\undomanager.js" )


	$CssDir =Join-Path -Path $BaseDir -ChildPath "src\app\css\lib"
	Remove-Item $CssDir\* -recurse
	New-Item $CssDir -type directory -force > $null

	$client.DownloadFile("http://code.jquery.com/ui/1.11.0/themes/smoothness/jquery-ui.css", "$CssDir\jquery-ui-1.11.0-smoothness.css")
	
	echo "Fetching of dependencies successful."
} catch {
	Write-Error $Error[0]
    echo "Fetching of dependencies failed!"
}


