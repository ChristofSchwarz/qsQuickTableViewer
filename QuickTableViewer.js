define(["qlik", 
		"jquery",
		"./properties"],
function (qlik, $, properties) {
	
	return {
		support : {
			snapshot: false,
			export: false,
			exportData : false
		},
		definition: properties,
		paint: function ($element, layout) {
			var helpUrl = 'https://github.com/ChristofSchwarz/qsQuickTableViewer/blob/master/README.md';
			$element.html(
			'<table height="100%" style="background-color:#eee;"><tr><td style="text-align:center;">'
			+'<p>This is a placeholder for your table.</p>'
			+'<p>After making your selections in the accordion menu on the right</p>'
			+'<p>this will become a standard Qlik Sense table (QlikTableViewer not needed then).</p>'
			+'<a class="lui-button" style="margin-top:5px;" href="' + helpUrl+ '" target="_new">More info</a>'
			+'<td></tr></table>');
			//needed for export
			return qlik.Promise.resolve();
		}
	};
});
