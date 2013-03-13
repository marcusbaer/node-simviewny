var SImg = Backbone.Model.extend({
    defaults: {
        'id': null,
        'title': null,
        'src': null,
        'full': null,
        'info': null,
        'rotation': 0,
        'excludetime': null,
        'shottime': null,
        'shotplace': null
    }
});

var SImgs = Backbone.Collection.extend({
   model: SImg
});

var images = new SImgs();
images.reset();

$(document).ready(function(){

/*
     $.get('/service/image/thumbs/Raspberry_Pi-595x446.jpg', function(imgdata){
        console.log("single get");
        console.log(imgdata);
     });
*/

    $.get('/service/images', function(imgdata){
        images.reset();
        imgdata = JSON.parse(imgdata);
        var img_src = '';
        _.each(imgdata, function(img){
            var i = new SImg(img);
            images.push(i);
            img_src = img_src + '<div class="image"><img src="' + img.src + '" height="120" /></div>';
        });

        // append all images to display
        $("body").append("<h1>simviewny</h1><p>You have " + images.length + " image" + ((images.length>1) ? "s" : "") +  " stored.</p>");
        $("body").append(img_src);
        $("body").append('<div class="big"><img src="" style="display: none;" /></div>');

        // attach click events to zoom in and out
        $(".image img").click(function(){
            var image = images.get($(this).attr("src"));
            $(".big img").attr("src", image.get('full') ).show();
        });

        $(".big img").click(function(){
            $(this).attr("src", "").hide();
        });

        // test a post request
        $.ajax({
            url: '/service/image/thumbs/Raspberry_Pi-595x446.jpg',
            method: 'POST',
            data: JSON.stringify(images.get('thumbs/Raspberry_Pi-595x446.jpg')),
            success: function(imgdata){
                console.log("image meta data saved for ...");
                console.log(imgdata);
            }
        });

    });

});