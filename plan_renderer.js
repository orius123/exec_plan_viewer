Renderer = function (canvas) {
    canvas = $(canvas).get(0);
    var ctx = canvas.getContext("2d");
    var particleSystem = null;
    var gfx = arbor.Graphics(canvas);
    var clickCallback;
    var that = {
        onClk : function (func) {
            clickCallback = func;
        },
        init : function (system) {
            particleSystem = system;
            particleSystem.screenPadding(100, 60, 60, 60);
            $(window).resize(that.resize);
            that.initMouseHandling();
            that.resize();
        },
        redraw : function () {
            gfx.clear(); // convenience ƒ: clears the whole canvas rect

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "#d3d3d3";
            ctx.lineWidth = 1;
            ctx.beginPath();
            particleSystem.eachEdge(function (edge, pt1, pt2) {
                var weight = null;
                var color = edge.data.color;
                if (!color || ("" + color).match(/^[ \t]*$/)) {
                    color = null;
                }

                ctx.save();
                ctx.beginPath();

                if (!isNaN(weight)) ctx.lineWidth = weight;

                ctx.fillStyle = null;
                ctx.strokeStyle = (color) ? color : "#cccccc";

                ctx.moveTo(pt1.x, pt1.y);
                ctx.lineTo(pt2.x, pt2.y);
                ctx.stroke();
                ctx.restore();
            });
            ctx.stroke();

            particleSystem.eachNode(function (node, pt) {
                var w = ctx.measureText(node.data.label || "").width + 6;
                var label = node.data.label;
                if ((label || "").match(/^[ \t]*$/)) {
                    label = null
                } else {
                    pt.x = Math.floor(pt.x);
                    pt.y = Math.floor(pt.y);
                }

                ctx.clearRect(pt.x - w / 2, pt.y - 7, w, 14);

                if (label) {
                    ctx.font = "bold 11px Arial";
                    ctx.textAlign = "center";
                    ctx.fillStyle = node.data.color ? node.data.color : "#888888";
                    ctx.fillText(label || "", pt.x, pt.y + 4);
                }
            });
        },

        resize : function () {
            var canvasContainer = $("#canvasContainer");
            var w = canvasContainer.width(),
                h = canvasContainer.height();
            canvas.width = w;
            canvas.height = h;
            particleSystem.screenSize(w, h);
            that.redraw();
        },

        initMouseHandling : function () {
            var selected = null,
                nearest = null,
                dragged = null,
                oldmass = 1;

            $(canvas).mousedown(function (e) {
                var pos = $(this).offset();
                var p = {x : e.pageX - pos.left, y : e.pageY - pos.top};
                selected = nearest = dragged = particleSystem.nearest(p);

                if (selected.node !== null) {
                    dragged.node.tempMass = 50;
                    dragged.node.fixed = true;
                    if (clickCallback) {
                        clickCallback(selected.node);
                    }
                }
                return false;
            });

            $(canvas).mousemove(function (e) {
                var oldNearest = nearest && nearest.node._id;
                var pos = $(this).offset();
                var s = {x : e.pageX - pos.left, y : e.pageY - pos.top};

                var nearest = particleSystem.nearest(s);
                if (!nearest) return;

                if (dragged !== null && dragged.node !== null) {
                    var p = particleSystem.fromScreen(s);
                    dragged.node.p = {x : p.x, y : p.y};
                    // dragged.tempMass = 10000
                }

                return false
            });

            $(window).bind('mouseup', function (e) {
                if (dragged === null || dragged.node === undefined) {
                    return;
                }
                dragged.node.fixed = false;
                dragged.node.tempMass = 100;
                dragged = null;
                selected = null;
                return false;
            });
        }
    };

    return that
};
