"use strict";

var fs = require("fs");
var kb = require("keyboardjs");
var lz = require("lz-string");
var $ = require("jquery");


var Renderer = require("./renderer");
var View = require("./view");
var System = require("./system");
var xyz = require("./xyz");
var presets = require("./presets");


//Required ChEMBL APIs
var smiles2ctab = "https://www.ebi.ac.uk/chembl/api/utils/smiles2ctab/";
var ctab2xyz = "https://www.ebi.ac.uk/chembl/api/utils/ctab2xyz/";


window.onerror = function(e, url, line) {
    var error = document.getElementById("error");
    error.style.display = "block";
    var error = document.getElementById("error-text");
    error.innerHTML = "Sorry, an error has occurred:<br><br>Line #" + line + ": " + e;
}

kb.active = function(key) {
    var keys = kb.activeKeys();
    for (var i = 0; i < keys.length; i++) {
        if (key === keys[i]) {
            return true;
        }
    }
    return false;
}

var system = System.new();
var view = View.new();
var renderer = null;
var needReset = false;

var renderContainer;



function encoder(value) {
    return btoa(value);
};

function request_chembl(url, value, callback) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            callback(xhttp.responseText);
        } else {
            var error = document.getElementById("error");
            error.style.display = "block";
            var error = document.getElementById("error-text");
            error.innerHTML = "ChEMBL has failed to respond. Status: " + xhttp.status;
        }
    }
    xhttp.open("GET", url + value);
    xhttp.setRequestHeader("Content-type", "text/plain");
    xhttp.send();

};

//Function to get the XYZ data
var load_xyz = function(data){
    document.getElementById('xyz-value').innerHTML = data;
    loadStructure(xyz(data)[0]);
};

var get_xyz = function(response){
    console.log("RESPONSE CTAB: "+ response);
    var data = encoder(response);
    request_chembl(ctab2xyz, data, load_xyz)
};

function loadStructure(data) {
    system = System.new();
    for (var i = 0; i < data.length; i++) {

        var a = data[i];
        var x = a.position[0];
        var y = a.position[1];
        var z = a.position[2];
        System.addAtom(system, a.symbol, x,y,z);
    }
    System.center(system);
    System.calculateBonds(system);
    renderer.setSystem(system, view);
    View.center(view, system);
    needReset = true;
    document.getElementById("speck-viewer").style.display = 'block';
}


window.onload = function() {

    document.getElementById("speck-viewer").style.display = 'none';

    renderContainer = document.getElementById("render-container");

    var imposterCanvas = document.getElementById("renderer-canvas");

    renderer = new Renderer(imposterCanvas, view.resolution, view.aoRes)

    if (location.hash !== "") {
        var hash = location.hash.slice(1, location.hash.length);
        var data = lz.decompressFromEncodedURIComponent(hash);
        data = JSON.parse(data);
        system = data.system;
        view = data.view;
        renderer.setSystem(system, view);
        renderer.setResolution(view.resolution, view.aoRes);
        needReset = true;
    } else {
        //Do nothing
    }

    var lastX = 0.0;
    var lastY = 0.0;
    var buttonDown = false;

    renderContainer.addEventListener("mousedown", function(e) {
        document.body.style.cursor = "none";
        if (e.button == 0) {
            buttonDown = true;
        }
        lastX = e.clientX;
        lastY = e.clientY;
    });

    window.addEventListener("mouseup", function(e) {
        document.body.style.cursor = "";
        if (e.button == 0) {
            buttonDown = false;
        }
    });

    setInterval(function() {
        if (!buttonDown) {
            document.body.style.cursor = "";
        }
    }, 10);

    window.addEventListener("mousemove", function(e) {
        if (!buttonDown) {
            return;
        }
        var dx = e.clientX - lastX;
        var dy = e.clientY - lastY;
        if (dx == 0 && dy == 0) {
            return;
        }
        lastX = e.clientX;
        lastY = e.clientY;
        if (e.shiftKey) {
            View.translate(view, dx, dy);
        } else {
            View.rotate(view, dx, dy);
        }
        needReset = true;
    });

    renderContainer.addEventListener("wheel", function(e) {
        var wd = 0;
        if (e.deltaY < 0) {
            wd = 1;
        }
        else {
            wd = -1;
        }
        if (kb.active("a")) {
            view.atomScale += wd/100;
            View.resolve(view);
            document.getElementById("atom-radius").value = Math.round(view.atomScale * 100);
            needReset = true;
        } else if (kb.active("z")) {
            var scale = view.relativeAtomScale;
            scale += wd/100;
            view.relativeAtomScale += wd/100;
            View.resolve(view);
            document.getElementById("relative-atom-radius").value = Math.round(view.relativeAtomScale * 100);
            needReset = true;
        } else if (kb.active("d")) {
            view.dofStrength += wd/100;
            View.resolve(view);
            document.getElementById("dof-strength").value = Math.round(view.dofStrength * 100);
        } else if (kb.active("p")) {
            view.dofPosition += wd/100;
            View.resolve(view);
            document.getElementById("dof-position").value = Math.round(view.dofPosition * 100);
        } else if (kb.active("b")) {
            view.bondScale += wd/100;
            View.resolve(view);
            document.getElementById("bond-radius").value = Math.round(view.bondScale * 100);
            needReset = true;
        } else if (kb.active("s")) {
            view.bondShade += wd/100;
            View.resolve(view);
            document.getElementById("bond-shade").value = Math.round(view.bondShade * 100);
            needReset = true;
        } else if (kb.active("w")) {
            view.atomShade += wd/100;
            View.resolve(view);
            document.getElementById("atom-shade").value = Math.round(view.atomShade * 100);
            needReset = true;
        } else if (kb.active("o")) {
            view.ao += wd/100;
            View.resolve(view);
            document.getElementById("ambient-occlusion").value = Math.round(view.ao * 100);
        } else if (kb.active("l")) {
            view.brightness += wd/100;
            View.resolve(view);
            document.getElementById("brightness").value = Math.round(view.brightness * 100);
        } else if (kb.active("q")) {
            view.outline += wd/100;
            View.resolve(view);
            document.getElementById("outline-strength").value = Math.round(view.outline * 100);
        } else {
            view.zoom = view.zoom * (wd === 1 ? 1/0.9 : 0.9);
            View.resolve(view);
            needReset = true;
        }
        e.preventDefault();
    });

    var buttonUpColor = "#bbb";
    var buttonDownColor = "#3bf";

    function hideAllControls() {
        document.getElementById("controls-render").style.display = "none";
    }

    function showControl(id) {
        hideAllControls();
        document.getElementById("controls-" + id).style.display = "block";
    }


    showControl("render");

    function reflow() {
        var menu = document.getElementById("controls-menu");
        var ccon = document.getElementById("controls-container");

        var ww = window.innerWidth;
        var wh = window.innerHeight;

        var rcw = Math.round(wh * 1);
        var rcm = Math.round((wh - rcw) / 2);

        renderContainer.style.height = rcw - 64 + "px";
        renderContainer.style.width = rcw - 64+ "px";
        renderContainer.style.left = rcm + 32 + "px";
        renderContainer.style.top = rcm + 32 + "px";

        menu.style.left = rcw + "px";
        menu.style.top = 32 + "px";

        ccon.style.top = 32 + $(menu).innerHeight() + 32 + "px";

        ccon.style.left = menu.style.left;
        ccon.style.bottom = "32px";
    }

    reflow();

    window.addEventListener("resize", reflow);

    document.getElementById("close-error").addEventListener("click", function() {
        document.getElementById("error").style.display = "none";
    });

    //Starting point of Action
    document.getElementById("openFile").addEventListener("change", function() {
        var file = document.getElementById("openFile").files[0];
        if (file) {
            var fr = new FileReader();
            fr.readAsText (file, "UTF-8");
            fr.onload = function (evt) { document.getElementById("openFile").innerHtml = evt.target.result;
                var smiles = evt.target.result;
                console.log("Input SMILES: "+smiles);
                if (smiles === "") {
                    var error = document.getElementById("error");
                    error.style.display = "block";
                    var error = document.getElementById("error-text");
                    error.innerHTML = 'File is Empty. Kindly reload a file with a SMILES string';
                }
                else {
                    request_chembl(smiles2ctab, encoder(smiles), get_xyz);
                }

            }
            fr.onerror = function (evt) { document.getElementById("openFile").innerHtml = "error reading file";
                var error = document.getElementById("error");
                error.style.display = "block";
                var error = document.getElementById("error-text");
                error.innerHTML = "error reading file";
            }
        }
    });


    document.getElementById("atom-radius").addEventListener("input", function(e) {
        var scale = parseInt(document.getElementById("atom-radius").value);
        view.atomScale = scale/100;
        View.resolve(view);
        needReset = true;
    });

    document.getElementById("relative-atom-radius").addEventListener("input", function(e) {
        var scale = parseInt(document.getElementById("relative-atom-radius").value);
        view.relativeAtomScale = scale/100;
        View.resolve(view);
        needReset = true;
    });

    document.getElementById("dof-strength").addEventListener("input", function(e) {
        var scale = parseInt(document.getElementById("dof-strength").value);
        view.dofStrength = scale/100;
        View.resolve(view);
    });

    document.getElementById("dof-position").addEventListener("input", function(e) {
        var scale = parseInt(document.getElementById("dof-position").value);
        view.dofPosition = scale/100;
        View.resolve(view);
    });

    document.getElementById("bond-radius").addEventListener("input", function(e) {
        var scale = parseInt(document.getElementById("bond-radius").value);
        view.bondScale = scale/100;
        View.resolve(view);
        needReset = true;
    });

    document.getElementById("bond-shade").addEventListener("input", function(e) {
        var scale = parseInt(document.getElementById("bond-shade").value);
        view.bondShade = scale/100;
        View.resolve(view);
        needReset = true;
    });

    document.getElementById("atom-shade").addEventListener("input", function(e) {
        var scale = parseInt(document.getElementById("atom-shade").value);
        view.atomShade = scale/100;
        View.resolve(view);
        needReset = true;
    });

    document.getElementById("ambient-occlusion").addEventListener("input", function(e) {
        var scale = parseInt(document.getElementById("ambient-occlusion").value);
        view.ao = scale/100;
        View.resolve(view);
    });

    document.getElementById("brightness").addEventListener("input", function(e) {
        var scale = parseInt(document.getElementById("brightness").value);
        view.brightness = scale/100;
        View.resolve(view);
    });

    document.getElementById("ao-resolution").addEventListener("change", function(e) {
        var resolution = parseInt(document.getElementById("ao-resolution").value);
        view.aoRes = resolution;
        View.resolve(view);
        renderer.setResolution(view.resolution, view.aoRes);
        needReset = true;
    });

    document.getElementById("outline-strength").addEventListener("input", function(e) {
        var scale = parseInt(document.getElementById("outline-strength").value);
        view.outline = scale/100;
        View.resolve(view);
    });

    document.getElementById("samples-per-frame").addEventListener("change", function(e) {
        var spf = parseInt(document.getElementById("samples-per-frame").value);
        view.spf = spf;
    });

    document.getElementById("resolution").addEventListener("change", function(e) {
        var resolution = parseInt(document.getElementById("resolution").value);
        view.resolution = resolution;
        View.resolve(view);
        renderer.setResolution(resolution, view.aoRes);
        needReset = true;
    });

    document.getElementById("view-preset").addEventListener("change", function(e) {
        var preset = document.getElementById("view-preset").value;
        View.override(view, presets[preset]);
        updateControls();
        renderer.setSystem(system, view);
        needReset = true;
    });

    document.getElementById("bonds").addEventListener("click", function(e) {
        view.bonds = document.getElementById("bonds").checked;
        View.resolve(view);
        renderer.setSystem(system, view);
        needReset = true;
    });

    document.getElementById("bond-threshold").addEventListener("change", function(e) {
        view.bondThreshold = parseFloat(document.getElementById("bond-threshold").value);
        View.resolve(view);
        renderer.setSystem(system, view);
        needReset = true;
    });

    document.getElementById("fxaa").addEventListener("change", function(e) {
        view.fxaa = parseInt(document.getElementById("fxaa").value);
        View.resolve(view);
    });


    document.getElementById("center-button").addEventListener("click", function(e) {
        View.center(view, system);
        needReset = true;
    });


    function updateControls() {
        document.getElementById("atom-radius").value = Math.round(view.atomScale * 100);
        document.getElementById("relative-atom-radius").value = Math.round(view.relativeAtomScale * 100);
        document.getElementById("bond-radius").value = Math.round(view.bondScale * 100);
        document.getElementById("bond-shade").value = Math.round(view.bondShade * 100);
        document.getElementById("atom-shade").value = Math.round(view.atomShade * 100);
        document.getElementById("bond-threshold").value = view.bondThreshold;
        document.getElementById("ambient-occlusion").value = Math.round(view.ao * 100);
        document.getElementById("brightness").value = Math.round(view.brightness * 100);
        document.getElementById("ao-resolution").value = view.aoRes;
        document.getElementById("samples-per-frame").value = view.spf;
        document.getElementById("outline-strength").value = Math.round(view.outline * 100);
        document.getElementById("bonds").checked = view.bonds;
        document.getElementById("fxaa").value = view.fxaa;
        document.getElementById("resolution").value = view.resolution;
        document.getElementById("dof-strength").value = Math.round(view.dofStrength * 100);
        document.getElementById("dof-position").value = Math.round(view.dofPosition * 100);
    }

    updateControls();

    function loop() {

        document.getElementById("atom-radius-text").innerHTML = Math.round(view.atomScale * 100) + "%";
        document.getElementById("relative-atom-radius-text").innerHTML = Math.round(view.relativeAtomScale * 100) + "%";
        document.getElementById("bond-radius-text").innerHTML = Math.round(view.bondScale * 100) + "%";
        document.getElementById("bond-shade-text").innerHTML = Math.round(view.bondShade * 100) + "%";
        document.getElementById("atom-shade-text").innerHTML = Math.round(view.atomShade * 100) + "%";
        document.getElementById("ambient-occlusion-text").innerHTML = Math.round(view.ao * 100) + "%";
        document.getElementById("brightness-text").innerHTML = Math.round(view.brightness * 100) + "%";
        document.getElementById("outline-strength-text").innerHTML = Math.round(view.outline * 100) + "%";
        document.getElementById("dof-strength-text").innerHTML = Math.round(view.dofStrength * 100) + "%";
        document.getElementById("dof-position-text").innerHTML = Math.round(view.dofPosition * 100) + "%";
        document.getElementById("ao-indicator").style.width = Math.min(100, (renderer.getAOProgress() * 100)) + "%";

        if (needReset) {
            renderer.reset();
            needReset = false;
        }
        renderer.render(view);
        requestAnimationFrame(loop);
    }

    loop();

}
