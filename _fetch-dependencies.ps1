try {
	$client = new-object System.Net.WebClient

	$BaseDir = [System.IO.Path]::GetDirectoryName($myInvocation.MyCommand.Definition)

	$JsDir = Join-Path -Path $BaseDir -ChildPath "js\lib"
	New-Item $JsDir -type directory -force > $null
	Remove-Item $JsDir\* -recurse

	$client.DownloadFile("http://code.jquery.com/jquery-2.1.1.min.js", "$JsDir\jquery-2.1.1.min.js")
	$client.DownloadFile("http://code.jquery.com/ui/1.11.0/jquery-ui.js", "$JsDir\jquery-ui-1.11.0.js")
	$client.DownloadFile("https://rawgit.com/eligrey/FileSaver.js/master/FileSaver.js", "$JsDir\FileSaver.js" )
	$client.DownloadFile("https://rawgit.com/ArthurClemens/Javascript-Undo-Manager/master/js/undomanager.js", "$JsDir\undomanager.js" )


	$CssDir =Join-Path -Path $BaseDir -ChildPath "css\lib"
	Remove-Item $CssDir\* -recurse
	New-Item $CssDir -type directory -force > $null

	$client.DownloadFile("http://code.jquery.com/ui/1.11.0/themes/smoothness/jquery-ui.css", "$CssDir\jquery-ui-1.11.0-smoothness.css")
	
	echo "Fetching of dependencies successful."
} catch {
	Write-Error $Error[0]
    echo "Fetching of dependencies failed!"
}


