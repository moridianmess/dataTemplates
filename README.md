# dataTemplates
Inspired by dataTables, this is a template driven, searchable, sortable, responsive grid.

Full Documentation and examples are available at [moridiweb.com](http://moridiweb.com/dataTemplates.html).

By default ajaxExtend is required for JSON calls, I will be adding an override for this shortly. 

By default templateEngine is required for loading the design, I will be adding an override for this shortly.

```javascript
<script src="template.js"></script>
<script src="jQuery.ajaxExtend.js"></script>
<script src="jQuery.dataTemplates.js"></script>
<link type="text/css" rel="stylesheet" href="dataTemplates.css" />
```

```html
<div id="dt1" title="Title" class="dataTemplates">
</div>
```

```javascript
$('#dt1').dataTemplates({
	"ajax": {
		"optionsUrl": "templates/json/dataTemplatesOptions.json",
		"url": "/templates/json/data.json"
	},
	templateDir: "templates/"
});
```