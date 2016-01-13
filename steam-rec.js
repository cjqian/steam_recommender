// -------------------------------------------------------------------
// A number of forward declarations. These variables need to be defined since 
// they are attached to static code in HTML. But we cannot define them yet
// since they need D3.js stuff. So we put placeholders.


// Highlight a movie in the graph. It is a closure within the d3.json() call.
var selectMovie = undefined;

// Change status of a panel from visible to hidden or viceversa
var toggleDiv = undefined;

// Clear all help boxes and select a movie in network and in movie details panel
var clearAndSelect = undefined;


// The call to set a zoom value -- currently unused
// (zoom is set via standard mouse-based zooming)
var zoomCall = undefined;


// -------------------------------------------------------------------

// Do the stuff -- to be called after D3.js has loaded
function D3ok() {

    // Some constants
    var WIDTH = 1200,
        HEIGHT = 900,
        SHOW_THRESHOLD = 2.5;

    // Variables keeping graph state
    var activeMovie = undefined;
    var currentOffset = { x : 0, y : 0 };
    var currentZoom = 1.0;

    // The D3.js scales
    var xScale = d3.scale.linear()
        .domain([0, WIDTH])
        .range([0, WIDTH]);
    var yScale = d3.scale.linear()
        .domain([0, HEIGHT])
        .range([0, HEIGHT]);
    var zoomScale = d3.scale.linear()
        .domain([1,6])
        .range([1,6])
        .clamp(true);

    /* .......................................................................... */

    // The D3.js force-directed layout
    var force = d3.layout.force()
        .charge(-320)
        .size( [WIDTH, HEIGHT] )
        .linkStrength( function(d,idx) { return d.weight; } );

    // Add to the page the SVG element that will contain the movie network
    var svg = d3.select("#movieNetwork").append("svg:svg")
        .attr('xmlns','http://www.w3.org/2000/svg')
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .attr("id","graph")
        .attr("viewBox", "0 0 " + WIDTH + " " + HEIGHT )
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Movie panel: the div into which the movie details info will be written
    movieInfoDiv = d3.select("#movieInfo");

    /* ....................................................................... */

    // Get the current size & offset of the browser's viewport window
    function getViewportSize( w ) {
        var w = w || window;
        if( w.innerWidth != null ) 
            return { w: w.innerWidth, 
                h: w.innerHeight,
                x : w.pageXOffset,
                y : w.pageYOffset };
        var d = w.document;
        if( document.compatMode == "CSS1Compat" )
            return { w: d.documentElement.clientWidth,
                h: d.documentElement.clientHeight,
                x: d.documentElement.scrollLeft,
                y: d.documentElement.scrollTop };
        else
            return { w: d.body.clientWidth, 
                h: d.body.clientHeight,
                x: d.body.scrollLeft,
                y: d.body.scrollTop};
    }



    function getQStringParameterByName(name) {
        var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }

    /* Compose the content for the panel with movie details.
       Parameters: the node data, and the array containing all nodes
       */
    function getGameInfo( n, nodeArray ) {
        //landing bar
        info =
            '<div>' 
            + '<span class="right-icon glyphicon glyphicon-remove action" title="close panel" onClick="toggleDiv(\'movieInfo\');"></span>' 
            + '<span class="right-icon glyphicon glyphicon-search action" title="center graph on game" onclick="selectMovie('+n.index+',true);"></span>' 
            + "<span class='right-icon' title='steam page'><a href='http://store.steampowered.com/app/" + n.steam_id + "'" + '><i class="fa fa-steam-square"></i></a></span>' 


            + '<span class="left-icon glyphicon glyphicon-heart action" title="remove game from graph" onclick="heartMovie('+n.index+');"></span>'
            + '<span class="left-icon glyphicon glyphicon-trash action" title="remove game from graph" onclick="removeMovie('+n.index+');"></span>'

            + '</div>';

        //cover
        info += '<div id="brokenCover"></div>';
        info += '<div id="cover">';
        if( n.cover )
            info += '<img class="cover" style="width:100%" src="' 
                + n.cover 
                + '" title="' 
                + n.label 
                + '" onError="imageError(' 
                + n.title 
                + ');"/></div>';
        else
            info += '<div class=t style="float: right">' + n.title + '</div></div>';

        //website
        if ( n.website ){
            info += '<div class=f><span class=l>Game</span>: <a href=' + n.website + '><span class=d>' 
                + n.label + '</span></a></div>';
        } else {
            info += '<div class=f><span class=l>Game</span>: <span class=d>' 
                + n.label + '</span></div>';
        }



        //rating
        if( n.rating )
            info += '<div class=f><span class=l>Rating</span>: <a href= ' + n.rating.url + '/><span class=c>' 
                + n.rating.score + '</span></a></div>';

        //recommendations
        if( n.recommendations )
            info += '<div class=f><span class=l>Recommendations</span>: <span class=c>' 
                + n.recommendations + '</span></div>';

        //price
        if( n.price )
            info += '<div class=f><span class=l>Price</span>: <span class=d>' 
                + setPrice(n.price) + '</span></div>';

        //website on steam

        info += '<div class=f><span class=l>Related to</span>: ';
        info += "<ul>";

        n.links.forEach( function(idx) {
            info += '<li><a href="javascript:void(0);" onclick="selectMovie('  
            + idx + ',true);">' + nodeArray[idx].label + '</a></li>'
        });

        info += "</ul>";
        info += '</div>';

        if( n.description )
            info += '<div class=f><span class=l>Description</span>:<br/> <span class=g>' 
                + n.description + '</span></div>';

        return info;
    }


    // *************************************************************************
    d3.json(
            'data/results.json',
            function(data) {
                // Declare the variables pointing to the node & link arrays
                var nodeArray = data.nodes;
                var linkArray = data.links;

                minScoreWeight = 
        Math.min.apply( null, nodeArray.map( function(n) {return n["rating"]["score"];} ) );
    maxScoreWeight = 
        Math.max.apply( null, nodeArray.map( function(n) {return n["rating"]["score"];} ) );

    minLinkWeight = 
        Math.min.apply( null, linkArray.map( function(n) {return n.weight;} ) );
    maxLinkWeight = 
        Math.max.apply( null, linkArray.map( function(n) {return n.weight;} ) );

    // Add the node & link arrays to the layout, and start it
    force
        .nodes(nodeArray)
        .links(linkArray)
        .start();

        // A couple of scales for node radius & edge width
    var node_size = d3.scale.linear()
        .domain([minScoreWeight, maxScoreWeight])   // we know score is in this domain
        .range([5, 16]) //good size
        .clamp(false);

    //weight is how closely related two games are
    var edge_width = d3.scale.pow().exponent(8)
        .domain( [minLinkWeight,maxLinkWeight] )
        .range([1, 10])
        .clamp(true);

    /* Add drag & zoom behaviours */
    svg.call( d3.behavior.drag()
            .on("drag",dragmove) );
    svg.call( d3.behavior.zoom()
            .x(xScale)
            .y(yScale)
            .scaleExtent([1, 6])
            .on("zoom", doZoom) );

    // ------- Create the elements of the layout (links and nodes) ------
    var networkGraph = svg.append('svg:g').attr('class','grpParent');

    // links: simple lines
    var graphLinks = networkGraph.append('svg:g').attr('class','grp gLinks')
        .selectAll("line")
        .data(linkArray, function(d) {return d.source.id+'-'+d.target.id;} )
        .enter().append("line")
        .style('stroke-width', function(d) { return edge_width(d.weight);} )
        .attr('class', function(d) {
            var sourceClass = "l" + d.source.id;
            var targetClass = "l" + d.target.id;
            return sourceClass + " " + targetClass + " " + "link";
        });

    // nodes: an SVG circle
    var graphNodes = networkGraph.append('svg:g').attr('class','grp gNodes')
        .selectAll("circle")
        .data( nodeArray, function(d){ return d.id; } )
        .enter().append("svg:circle")
        .attr('id', function(d) { return "c" + d.index; } )
        .attr('class', function(d) { return 'node level'+d.level;} )
        .attr('r', function(d) { 
            return (node_size(d["rating"]["score"])); } )
        .attr('pointer-events', 'all')
        //.on("click", function(d) { highlightGraphNode(d,true,this); } )    
        .on("click", function(d) { showMoviePanel(d); } )
        .on("mouseover", function(d) { highlightGraphNode(d,true,this);  } )
        .on("mouseout",  function(d) { highlightGraphNode(d,false,this); } ); //maybe, keeps hover

    // labels: a group with two SVG text: a title and a shadow (as background)
    var graphLabels = networkGraph.append('svg:g').attr('class','grp gLabel')
        .selectAll("g.label")
        .data( nodeArray, function(d){return d.label} )
        .enter().append("svg:g")
        .attr('id', function(d) { return "l" + d.index; } )
        .attr('class','label');

    shadows = graphLabels.append('svg:text')
        .attr('x','-2em')
        .attr('y','-.3em')
        .attr('pointer-events', 'none') // they go to the circle beneath
        .attr('id', function(d) { return "lb" + d.index; } )
        .attr('class','nshadow')
        .text( function(d) { return d.label; } );

    labels = graphLabels.append('svg:text')
        .attr('x','-2em')
        .attr('y','-.3em')
        .attr('pointer-events', 'none') // they go to the circle beneath
        .attr('id', function(d) { return "lf" + d.index; } )
        .attr('class','nlabel')
        .text( function(d) { return d.label; } );


    /* --------------------------------------------------------------------- */
    /* Select/unselect a node in the network graph.
       Parameters are: 
       - node: data for the node to be changed,  
       - on: true/false to show/hide the node
       */
    function highlightGraphNode( node, on )
    {
        //if( d3.event.shiftKey ) on = false; // for debugging

        // If we are to activate a movie, and there's already one active,
        // first switch that one off
        if( on && activeMovie !== undefined ) {
            console.log(nodeArray[activeMovie]);
            highlightGraphNode( nodeArray[activeMovie], false );
        }

        // locate the SVG nodes: circle & label group
        circle = d3.select( '#c' + node.index );
        label  = d3.select( '#l' + node.index );

        // activate/deactivate the node itself
        circle
            .classed( 'main', on );
        label
            .classed( 'on', on || currentZoom >= SHOW_THRESHOLD );
        label.selectAll('text')
            .classed( 'main', on );

        // activate all siblings
        Object(node.links).forEach( function(id) {
            d3.select("#c"+id).classed( 'sibling', on );

            label = d3.select('#l'+id);
            label.classed( 'on', on || currentZoom >= SHOW_THRESHOLD );
            label.selectAll('text.nlabel')
            .classed( 'sibling', on );
        } );

        // set the value for the current active movie
        activeMovie = on ? node.index : undefined;
    }

    /* -----------------------------------------------------------------------*/
    var heartArray = [];
    heartMovie = function( idx ){
        heartArray.push(idx);
        console.log(heartArray);
        console.log(idx);
    }

    /* Removes a game from the graph */
    removeMovie = function( idx ){
        var node = d3.select('#c' + idx);
        var label  = d3.select( '#l' + idx );

        var links = d3.selectAll('.l' + idx);

        //we remove all the lonely nodes
        for (i = 0; i < links[0].length; i++){
            var classList = links[0][i]["classList"];

            var otherLink = classList[0];
            var otherAttr = 0;

            if (otherLink == "l" + idx){
                otherLink = classList[1];
                otherAttr = 1;
            }

            var otherLinks = d3.selectAll('.' + otherLink);
            if (otherLinks[0].length == 1){
                var linkClass = otherLinks[0][0]["classList"][otherAttr];
                var nodeIdx = linkClass.substring(1, linkClass.length); 
                d3.select('#c' + nodeIdx).remove();
                d3.select('#l' + nodeIdx).remove();
            }
        }
 
        //update();
        node.remove();
        label.remove();
        links.remove();
        /* Then, remove all links */
        /* First, get an array of */    
        force.start();
    }

    /* --------------------------------------------------------------------- */
    /* Show the details panel for a movie AND highlight its node in 
       the graph. Also called from outside the d3.json context.
       Parameters:
       - new_idx: index of the movie to show
       - doMoveTo: boolean to indicate if the graph should be centered
       on the movie
       */

    /* SEARCH FUNCTION */
    var nameArray = [];
    populateNameArray = function(){
        for (var i = 0; i < nodeArray.length; i++){
            nameArray.push(nodeArray[i].label);
        }
    }

    //populate name array
    populateNameArray();

    $( "#gameSearch" ).autocomplete({
      source: nameArray
    });

    searchSelectMovie = function(){
        var gameName = document.getElementById("gameSearch").value;
        var index = nameArray.indexOf(gameName);
    
        if (index != -1){
            selectMovie(index, true);
        }
    }

    selectMovie = function( new_idx, doMoveTo ) {

        // do we want to center the graph on the node?
        doMoveTo = doMoveTo || false;
        if( doMoveTo ) {
            s = getViewportSize();
            width  = s.w<WIDTH ? s.w : WIDTH;
            height = s.h<HEIGHT ? s.h : HEIGHT;
            offset = { x : s.x + width/2  - nodeArray[new_idx].x*currentZoom,
                y : s.y + height/2 - nodeArray[new_idx].y*currentZoom };
            repositionGraph( offset, undefined, 'move' );
        }
        // Now highlight the graph node and show its movie panel
        highlightGraphNode( nodeArray[new_idx], true );
        showMoviePanel( nodeArray[new_idx] );
    }


    /* --------------------------------------------------------------------- */
    /* Show the movie details panel for a given node
    */
    function showMoviePanel( node ) {
        // Fill it and display the panel
        movieInfoDiv
            .html( getGameInfo(node,nodeArray) )
            .attr("class","panel_on");
    }


    /* --------------------------------------------------------------------- */
    /* Move all graph elements to its new positions. Triggered:
       - on node repositioning (as result of a force-directed iteration)
       - on translations (user is panning)
       - on zoom changes (user is zooming)
       - on explicit node highlight (user clicks in a movie panel link)
       Set also the values keeping track of current offset & zoom values
       */
    function repositionGraph( off, z, mode ) {

        // do we want to do a transition?
        var doTr = (mode == 'move');

        // drag: translate to new offset
        if( off !== undefined &&
                (off.x != currentOffset.x || off.y != currentOffset.y ) ) {
                    g = d3.select('g.grpParent')
                        if( doTr )
                            g = g.transition().duration(500);
                    g.attr("transform", function(d) { return "translate("+
                        off.x+","+off.y+")" } );
                    currentOffset.x = off.x;
                    currentOffset.y = off.y;
                }

        // zoom: get new value of zoom
        if( z === undefined ) {
            if( mode != 'tick' )
                return;   // no zoom, no tick, we don't need to go further
            z = currentZoom;
        }
        else
            currentZoom = z;

        // move edges
        e = doTr ? graphLinks.transition().duration(500) : graphLinks;
        e
            .attr("x1", function(d) { return z*(d.source.x); })
            .attr("y1", function(d) { return z*(d.source.y); })
            .attr("x2", function(d) { return z*(d.target.x); })
            .attr("y2", function(d) { return z*(d.target.y); });

        // move nodes
        n = doTr ? graphNodes.transition().duration(500) : graphNodes;
        n
            .attr("transform", function(d) { return "translate("
                +z*d.x+","+z*d.y+")" } );
        // move labels
        l = doTr ? graphLabels.transition().duration(500) : graphLabels;
        l
            .attr("transform", function(d) { return "translate("
                +z*d.x+","+z*d.y+")" } );
    }


    /* --------------------------------------------------------------------- */
    /* Perform drag
    */
    function dragmove(d) {
        offset = { x : currentOffset.x + d3.event.dx,
            y : currentOffset.y + d3.event.dy };
        repositionGraph( offset, undefined, 'drag' );
    }


    /* --------------------------------------------------------------------- */
    /* Perform zoom. We do "semantic zoom", not geometric zoom
     * (i.e. nodes do not change size, but get spread out or stretched
     * together as zoom changes)
     */
    function doZoom( increment ) {
        newZoom = increment === undefined ? d3.event.scale 
            : zoomScale(currentZoom+increment);
        if( currentZoom == newZoom )
            return; // no zoom change

        // See if we cross the 'show' threshold in either direction
        if( currentZoom<SHOW_THRESHOLD && newZoom>=SHOW_THRESHOLD )
            svg.selectAll("g.label").classed('on',true);
        else if( currentZoom>=SHOW_THRESHOLD && newZoom<SHOW_THRESHOLD )
            svg.selectAll("g.label").classed('on',false);

        // See what is the current graph window size
        s = getViewportSize();
        width  = s.w<WIDTH  ? s.w : WIDTH;
        height = s.h<HEIGHT ? s.h : HEIGHT;

        // Compute the new offset, so that the graph center does not move
        zoomRatio = newZoom/currentZoom;
        newOffset = { x : currentOffset.x*zoomRatio + width/2*(1-zoomRatio),
            y : currentOffset.y*zoomRatio + height/2*(1-zoomRatio) };

        // Reposition the graph
        repositionGraph( newOffset, newZoom, "zoom" );
    }

    zoomCall = doZoom;  // unused, so far

    /* --------------------------------------------------------------------- */

    /* process events from the force-directed graph */
    force.on("tick", function() {
        repositionGraph(undefined,undefined,'tick');
    });

    /* A small hack to start the graph with a movie pre-selected */
    mid = getQStringParameterByName('id')
        if( mid != null )
            clearAndSelect( mid );
            });

} // end of D3ok()

