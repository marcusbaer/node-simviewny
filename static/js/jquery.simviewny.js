$(document).ready(function(){

	$(".image img").click(function(){
        $(".big img").attr("src", $(this).attr("src") ).show();
    });

    $(".big img").click(function(){
        $(this).attr("src", "").hide();
    });

    $.get('/service/images', function(images){
        images = JSON.parse(images);
        var img_src = images.map(function(val) {
            return '<div class="image"><img src="' + val + '" height="120" /></div>';
        }).join('');
        $("body").append("<h1>simviewny</h1><p>You have " + images.length + " image" + ((images.length>1) ? "s" : "") +  " stored.</p>");
        $("body").append(img_src);
    });

});