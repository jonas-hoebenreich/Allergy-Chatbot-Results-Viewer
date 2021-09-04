/*
	Obj is the parsed JSON object sent to this client by the
	server. It has the format
	{ "question_tag": { "frage": "Text of the question", "priority": 1, "antwort": "Text of the answer"}
	Prio is always a float, frage and antwort are always strings. Obj,
	of course, contains several datapoints.
*/
var obj;

/*
	Keys is just the list of question tags in obj, sorted by their
	priorityrity.
*/
var keys;

/*
	Show an error message if the client is offline
*/

setInterval(function() {
	if(window.navigator.onLine) {
		document.getElementById("online_status").innerHTML='';
	} else {
		document.getElementById("online_status").innerHTML='<span id="offline" class="badge badge-warning">Sie sind offline.</span>';
	}
}, 1000);

/*
	If there is a relevant action, perform the corresponding response:
	If the user wants to upload something, perform the upload, if
	they want to search for a pseudonym, search. If the canvas is
	clicked, ignore if it's not on a button.
*/

$(document).ready(function() {
	$("#form").submit(search_pseud);
	$("#search").submit(search_pseud);
	$("#search").click(search_pseud);
	$("html").click(ignore);
	//$(".update_data").submit(upload_data);
	$(".update_data").click(upload_data);
	/*
		Show the modal when the button is clicked, I don't know what's
		preventing this from happening.
	*/
	$("#arztbrief").click(function() {
		arztbrief=write_arztbrief();
		$("#arztbrief_body").html(arztbrief);
		$("#arztbrief_modal_title").text("Arztbrief für Patient");
		$("#arztbrief_modal").modal({show : true});
	});
	$("#plaintext_table").click(function() {
		tabelle=write_tabelle();
		//console.log(tabelle);
		$("#arztbrief_body").html(tabelle);
		$("#arztbrief_modal_title").text("Tabelle für Patientendaten");
		$("#arztbrief_modal").modal({show : true});
	});
	$(".close_arztbrief").click(function() {
		$("#arztbrief_modal").modal("hide");
	});
	
	$('.dataroom_sync').on('click', function(){
		$('#sync_ergebnis').prepend('<span id="sync_durchfuehren" class="badge badge-info">Führe Dataroom Sync durch.</span>');
		//$("#dataroom_sync_modal").modal({show : true});
		//$('#dataroom_header').add('<h5 class="modal-title" id="dataroom_sync_title_loading">Führe Dataroom Sync durch</h5>');
        $.ajax({
            type: 'POST',
            url: '/',
            data: 'dataroom-sync=1'
        })
            .done(function( response ) {
            	$('#sync_ergebnis').empty();
            	$('#sync_ergebnis').prepend('<span id="sync_durchfuehren" class="badge badge-info">Dataroom Sync erfolgreich durchgeführt. Es wurden ' + response.dataroomsyncresult + ' neue Antwortdatei/en geladen.</span>');
            	//console.log(response);
            	setTimeout(function(){ $('#sync_ergebnis').empty(); }, 10000);
            })
            .fail(function( data ) {
            	$('#sync_ergebnis').empty();
            	$('#sync_ergebnis').prepend('<span id="sync_durchfuehren" class="badge badge-warning">Fehler beim Dataroom Sync.</span>');
            	console.log('error ajax');
            	setTimeout(function(){ $('#sync_ergebnis').empty(); }, 10000);
            });
	});
	
	$('body').on('click', '.penedit', function() {
		$('#' + $(this).attr("eid") + 'val').css('display', 'none');
		$('#' + $(this).attr("eid")).css('display', 'block');
		$('#' + $(this).attr("eid")).focus();
	});
});

/* Ignore the event, don't redirect to a GET request */

function ignore(e) {
	e.preventDefault();
}

/*
	Create the table that is written into the modal dialogue.
	@return: a string with the table, one entry per line, with
	colon-separation.
*/

function write_tabelle() {
	if(obj===undefined) {
		return "Keine Patientendaten geladen.";
	}
	tabelle="";
	for(k=0; k<keys.length; k++) {
		tabelle+=obj[keys[k]].frage+": "+obj[keys[k]].antwort.replace(/,/g, ", ")+"<br>";
	}
	return tabelle;
}

var german_ordinals=["nullte", "erste", "zweite", "dritte", "vierte", "fünfte", "sechste", "siebte", "achte", "neunte", "zehnte"];
var german_uppercase_ordinals=["Nullte", "Erste", "Zweite", "Dritte", "Vierte", "Fünfte", "Sechste", "Siebte", "Achte", "Neunte", "Zehnte"];
var german_months=["Januar", "Februar", "Maerz", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/*
	Before the modal is shown, write the Arztbrief into it.
	For this, use the JavaScript object obj.

	@return: returns the Arztbrief as a string that is written into
	the modal.
*/

function write_arztbrief() {
	if(obj===undefined) {
		return "Keine Patientendaten geladen.";
	}
	var arztbrief=""
	var krankheitsbilder=obj["krankheitsbilder"].antwort.split(",");
	console.log(krankheitsbilder);

	if(krankheitsbilder.includes("biene")) {
		arztbrief=arztbrief+arztbrief_insekt();
	}
	console.log(arztbrief);
	if(krankheitsbilder.includes("heuschnupfen")) {
		arztbrief=arztbrief+arztbrief_heuschnupfen();
	}
	console.log(arztbrief);
	if(krankheitsbilder.includes("Medikamentenallergie")) {
		arztbrief=arztbrief+arztbrief_medikamentenunvertraeglichkeit();
	}
	
	console.log(arztbrief);
	
	if (arztbrief.length == 0) {
		arztbrief = "Es konnte kein Arztbrief generiert werden, da keiner der unterstützten Gebiete angegeben wurden." +
				"<br>Aktuell werden unterstützt: Bienen- oder Wespenstichallergie (Auch Hummeln oder Hornissen), Heuschnupfen, Medikamentenallergie/Medikamentenunverträglichkeit";
	}

	return arztbrief;
}

/*
	Write the Arztbrief for insect allergy.
	Missing: 1.5, 1.6, 1.9, 1.11-1.14

	@return: a string that contains the Arztbrief for insect stuff,
	in HTML.
*/

function arztbrief_insekt() {
	var arztbrief="";
	arztbrief+="<br>Der/Die Patient*in stellt sich mit Bitte um Abklärung einer Reaktion auf ";

	let stichhaeufigkeit=parseInt(obj["stichhaeufigkeit"].antwort);

	if(stichhaeufigkeit>1) {
		arztbrief+=obj["stichhaeufigkeit"].antwort + " Insektenstiche vor.";
	} else {
		arztbrief+="einen Insektenstich vor.";
	}
	arztbrief+="<br>"

	if(stichhaeufigkeit!==NaN && stichhaeufigkeit>1) {
		for(i=1; i<=stichhaeufigkeit; i++) {
			arztbrief+="<br>" + german_uppercase_ordinals[i]+"s Stichereignis:<br>";
			arztbrief+=arztbrief_stichereignis(i);
		}
	} else if(stichhaeufigkeit!==NaN && stichhaeufigkeit===1) {
		arztbrief+=arztbrief_stichereignis(1);
	}

	return arztbrief;
}

/*
	Create a section of the Arztbrief for a sting event.

	@param i: the index of the sting event
	@return: a string that contains the portion of the Arztbrief in HTML.
*/

function arztbrief_stichereignis(i) {
	arztbrief="";

	//arztbrief+="Anamnestisch sei es " + obj["stichereignis_datum_"+i].antwort + " beim " +
	arztbrief+="Anamnestisch sei es beim " +
	obj["stichereignis_umgebung_"+i].antwort;

	if(obj["stichereignis_"+i].antwort==="Ich bin mir nicht sicher/Kann mich nicht erinnern") {
		arztbrief+=" zu einem Stich in die/den " + obj["stichereignis_koerperstelle_"+i].antwort + " durch ein unidentifizierbares Insekt gekommen. "
	} else if(obj["stichereignis_sonstiges_"+i].antwort!==undefined&&obj["stichereignis_sonstiges_"+i].antwort!=="") {
		arztbrief+=" zu einem Stich in die/den " + obj["stichereignis_koerperstelle_"+i].antwort + " durch ein vom Patienten als " + obj["stichereignis_sonstiges_"+i].antwort + " bezeichnetes Insekt gekommen. ";
	} else {
		arztbrief+=" zu einem Stich in die/den " + obj["stichereignis_koerperstelle_"+i].antwort + " durch eine " +
		obj["stichereignis_"+i].antwort +
		" gekommen, ";
	}

	switch(obj["stichereignis_stachel_"+i].antwort) {
	case "Ja":
		arztbrief+=" der Stachel sei stecken geblieben. "
		break;
	case "Nein":
		arztbrief+=" der Stachel sei nicht stecken geblieben. "
		break;
	case "Kann mich nicht erinnern / weiß ich nicht":
		arztbrief+=" der/die Patient/in kann sich nicht erinnern, ob der Stachel stecken geblieben wäre. "
		break;
	}

	arztbrief+="Der Patient ";
	umstaende=obj["stichereignis_umstaende_"+i].antwort.split(/,|, …/);
	umstaende[0]=umstaende[0].replace("…", "");
	umstaende[0]=umstaende[0].replace("...", "");
	if(umstaende.includes("kann mich nicht erinnern / weiß ich nicht")) {
		arztbrief+="könne sich nicht daran erinnern, ob er an dem Tag Schmerzmittel genommen oder Sport getrieben habe. ";
	} else {
		arztbrief+=" habe an dem Tag ";
		smi=umstaende.indexOf("Schmerzmittel genommen");
		if(smi>=0) {
			umstaende[smi]=" das Schmerzmittel " + obj["stichereignis_schmerzmittel_"+i].antwort + " genommen";
		}
		if(umstaende.length>1) {
			umstaende[umstaende.length-2]=umstaende[umstaende.length-2]+" und "+umstaende[umstaende.length-1];
			umstaende.pop();
		}
		arztbrief+=umstaende.join(", ") + ". ";
	}

	arztbrief+=" Circa " + obj["stichereignis_danach_"+i].antwort + " nach dem Stich sei es zu ";

	reaktionen=obj["stichereignis_reaktion_"+i].antwort.split(",");

	hautort=Math.max(reaktionen.indexOf("Hautjucken"), reaktionen.indexOf("Quaddeln"), reaktionen.indexOf("Hautrötung"));
	blutdruckabfall=reaktionen.indexOf("Blutdruckabfall");
	bewusstlosigkeit=reaktionen.indexOf("Bewusstlosigkeit");
	atemnot=reaktionen.indexOf("Atemnot");

	if(hautort>0) {
		reaktionen[hautort]+= " ("+ obj["stichereignis_reaktion_haut_ort_"+i].antwort +")";
	}
	if(blutdruckabfall>0) {
		switch(obj["stichereignis_reaktion_blutdruckabfall_x"].antwort) {
		case "Der Sanitäter/Arzt hat den Blutdruck gemessen und er war tief":
			reaktionen[blutdruckabfall]+= "(gemessen vom Arzt/Sanitäter)";
			break;
		case "ich habe ihn selbst gemessen":
			reaktionen[blutdruckabfall]+=" (vom Patienten selbst gemessen)";
			break;
		case "ich fühlte mich flau wie bei niedrigem Blutdruck":
			reaktionen[blutdruckabfall]+=" (durch Gefühl geschätzt)";
			break;
		}
	}
	if(bewusstlosigkeit>0) {
		reaktionen[bewusstlosigkeit]+=" (für ca. " + obj["stichereignis_reaktion_bewusstlos_dauer_"+i].antwort + ", ";
		if(obj["stichereignis_reaktion_bewusstlos_stuhl_"+i].antwort==="Ja") {
			reaktionen[bewusstlosigkeit]+=" mit Stuhl/Urinabgang)";
		} else {
			reaktionen[bewusstlosigkeit]+=" ohne Stuhl/Urinabgang)";
		}
	}
	if(atemnot>0) {
		reaktionen[atemnot]+=" (auf einer Skala von 1-10 bewertet mit " + obj["stichereignis_reaktion_atomnot_"+i].antwort +")";
	}

	if(reaktionen.length>1) {
		reaktionen[reaktionen.length-2]=reaktionen[reaktionen.length-2]+" und "+reaktionen[reaktionen.length-1];
		reaktionen.pop();
	}

	arztbrief+=reaktionen.join(", ") + " gekommen. ";

	switch(obj["stichereignis_behandelnd_"+i].antwort) {
	case "Ich habe selbst Maßnahmen ergriffen":
		arztbrief+="Der Patient ";
		if(obj["stichereignis_behandelnd_kuehlung_janein_"+i].antwort==="Ja") {
			arztbrief+=" kühlte die Stichstelle und ";
		}
		arztbrief+=" wandte " + obj["stichereignis_behandelnd_notfallset_"+i].antwort +  " aus dem Notfallset an.";
		break;
	case "Ich wurde von einem Arzt/Sanitäter behandelt":
		arztbrief+="Der Patient wurde vom " + obj["stichereignis_behandelnd_arzt_"+i].antwort + " mit " + obj["stichereignis_behandelnd_arzt_mittel_"+i].antwort + " behandelt. ";
		break;
	case "Ich wurde während des anschließenden Klinikaufenthalts behandelt":
		arztbrief+="Der Patient wurde während des anschließenden Klinikaufenthalts behandelt. ";
		break;
	case "Ich wurde auf der Intensivstation behandelt":
		arztbrief+="Der Patient wurde daraufhin auf der Intensivstation behandelt. ";
		break;
	}

	if(obj["stichereignis_hilfreich_"+i].antwort==="Ja, es ging mir schnell besser.") {
		arztbrief+="Die Therapie sei hilfreich gewesen. ";
	} else {
		arztbrief+="Die Therapie sei nicht hilfreich gewesen. ";
	}

	if(obj["stichereignis_stationaer_"+i].antwort==="Ja") {
		arztbrief+="Der Patien wäre nach dem Stichereignis zur Überwachung im Krankenhaus behalten worden. ";
	} else {
		arztbrief+="Der Patient sei nach dem Stichereignis nicht ins Krankenhaus gebracht worden. ";
	}
	arztbrief+="Vor dem Stichereignis habe der Patient ähnliche Stichereignisse wiefolgt vertragen: " + obj["stichereignis_vorher_"+i].antwort + ". ";

	if(obj["stichereignis_nochmals_"+i].antwort==="Nein") {
		arztbrief+="Zudem sei der Patient seitdem nicht noch einmal gestochen worden. ";
	} else {
		switch(obj["stichereignis_nochmals_vertragen_"+i].antwort) {
		case "Ohne Symptome vertragen":
			arztbrief+="Der Patient sei seitdem wieder gestochen worden, ohne Symptome zu zeigen. ";
			break;
		case "Weder ähnliche Symptome wie bei der eben beschriebenen Reaktion":
			arztbrief+="Der Patient sei seitdem wieder gestochen worden, und habe ähnliche Reaktionen gezeigt. ";
			break;
		case "Nur leichte Symptome":
			arztbrief+="Der Patient sei seitdem wieder gestochen worden, habe aber nur leichte Symptome gezeigt.";
			break;
		}
	}

	arztbrief+="<br>";

	return arztbrief;
}

/*
	Write the Arztbrief for hay fever.

	@return: a string that contains the Arztbrief in HTML.
*/

function arztbrief_heuschnupfen() {
	var arztbrief="";
	arztbrief+="<br>Der/Die Patient*in stellt sich mit Bitte um Abklärung einer RCA-Beschwerdesymptomatik vor. Er/Sie leide im ";
	arztbrief+=obj["heuschnupfenmonate"].antwort + " an ";
	arztbrief+=obj["heuschnupfensymptome"].antwort + ". ";
	arztbrief+="Die Symptome träten ";
	if(obj["heuschnupfenprowoche"].anwort==="Ja") {
		arztbrief+="häufiger als vier Tage pro Woche ";
	} else {
		arztbrief+="weniger häufig als vier Tage pro Woche ";
	}
	if(obj["heuschnupfenamstueck"].antwort==="Ja") {
		arztbrief+="sowie mehr als vier Wochen am Stück pro Jahr ";
	} else {
		arztbrief+="sowie weniger als vier Wochen am Stück pro Jahr ";
	}
	arztbrief+="auf. ";

	/* TODO: add when the therapy was conducted */
	if(obj["heuschnupfentherapiejanein"].antwort==="Ja") {
		arztbrief+="Der/die Patient*in wurde mit " + obj["heuschnupfentherapie"].antwort + "  behandelt. ";
	} else {
		arztbrief+="Der Patient hat sich keinen Heuschnupfentherapien unterzogen.";
	}

	return arztbrief;
}

/*
	Write the Arztbrief for medication problems.

	@return: string containing the Arztbrief.
*/

function arztbrief_medikamentenunvertraeglichkeit() {
	var arztbrief="";

	if(obj["medikamentenreaktionen"].antwort==="1") {
		arztbrief+="<br>Der/Die Patient*in stellt sich mit Bitte um Abklärung einer Medikamentenunverträglichkeit vor. ";
	} else {
		arztbrief+="<br>Der/Die Patient*in stellt sich mit Bitte um Abklärung von " + obj["MedikamentenReaktionen"].antwort + " Medikamentenallergien/unverträglichkeiten vor.";
	}

	var lim=1;
	if(obj["medikamentenreaktionen"].antwort==="Mehr als 3") {
		lim=4;
	} else {
		lim=parseInt(obj["medikamentenreaktionen"].antwort);
	}

	if(lim===1) {
		arztbrief+=pro_medikament(lim);
	} else {
		for(i=1; i<=lim; i++) {
			arztbrief+="<br><br>"+i+".) ";
			if(obj["medikamentenop_"+i].antwort==="Ja") {
				arztbrief+=pro_operation(i);
			} else {
				arztbrief+=pro_medikament(i);
			}
		}
	}

	//console.log(arztbrief);

	return arztbrief;
}

/*
	Write the Arztbrief for the allergy with the ith medication.

	@param i: the index of the medication, in {1..4}
	@return: string containing the Arztbrief for that medication.
*/

function pro_medikament(i) {
	arztbrief="";

	arztbrief+= obj["medikamentenwann_"+i].antwort + " sei/en auf die Einnahme von " +
	obj["medikamentenname_"+i].antwort;
	if(obj["medikamentengrund_"+i].antwort!=="Weiß ich nicht mehr") {
		", das wegen " + obj["medikamentengrund_"+i].antwort + " eingenommen wurde, ";
	} else {
		", das aus nicht weiter spezifizierten Gründen eingenommen wurde, ";
	}

	if(obj["medikamentendauer_"+i].antwort==="Einmalige Einnahme") {
		arztbrief+=" einmalig ";
	} else if(obj["medikamentendauer_"+i].antwort==="Einnahme über X Tage") {
		arztbrief+=" über den Verlauf von " + obj["medikamentendauertage_"+i].antwort + "  Tagen ";
	} else if(obj["medikamentendauer_"+i].antwort==="Einnahme über X Wochen") {
		arztbrief+=" über den Verlauf von " + obj["medikamentendauerwochen_"+i].antwort + " Wochen ";
	}
	arztbrief+=" " + obj["medikamentensymptome_"+i].antwort + " erfolgt. ";

	if(obj["medikamentendauer_"+i].antwort!=="Einmalige Einnahme") {
		arztbrief+="Die Reaktion sei " + obj["medikamentenausloesedauer_"+i].antwort + " nach der Einname aufgetreten. ";
	}
	// TODO: is this right?
	if(obj["medikamentenandere_"+i].antwort) {
		arztbrief+="Zu der Zeit sei auch " + obj["medikamentenanderename_"+i].antwort + " eingenommen worden. ";
	}

	if(obj["medikamentenbehandlungjanein_"+i].antwort==="Nein") {
		arztbrief+="Die Reaktion wurde nicht behandelt.";
	} else {
		switch(obj["medikamentenbehandlungwer_"+i].antwort) {
		case "Arzt":
			arztbrief+="Die Reaktion wurde von einem Arzt ";
			break;
		case "Notarzt":
			arztbrief+="Die Reaktion wurde von einem Notarzt ";
			break;
		case "Krankenhaus":
			arztbrief+="Die Reaktion wurde im Krankenhaus ";
			break;
		case "Selbst":
			arztbrief+="Die Reaktion wurde vom Patienten selbst ";
			break;
		}

		switch(obj["medikamentenbehandlungwie_"+i].antwort) {
		case "Tabletten":
			arztbrief+="mit " + obj["medikamentenbehandlungtabletten"+i].antwort + " behandelt worden. ";
			break;
		case "Spritze":
			arztbrief+="mit " + obj["medikamentenbehandlungspritze"+i].antwort + " behandelt worden. ";
			break;
		case "Infusion":
			arztbrief+="mit " + obj["medikamentenbehandlunginfusion"+i].antwort + " behandelt worden. ";
			break;
		case "Cortisoncreme":
			arztbrief+="mit einer Kortisoncreme behandelt worden. ";
			break;
		case "Sonstiges":
			arztbrief+="mit einem sonstigen Medikament behandelt worden. ";
			break;
		case "Weiß ich nicht":
			arztbrief+="mit einer Methode behandelt, an die sich der Patient nicht mehr erinnert. ";
			break;
		}
	}

	return arztbrief;
}

/*
	For an operation with index i, return the string composing the Arztbrief for operation i.
	@param i: the index of the operation, in {1..5}
	@return: a string containing the arztbrief
*/

function pro_operation() {
	var arztbrief="";

	arztbrief+=obj["MedikamentenOPWann"+i].antwort + " sei im " + obj["MedikamentenOPWo"+i].antwort + " eine Operation durchgeführt worden, für die der Patient folgenden Grund angibt: " + obj["MedikamentenOPGrund"+i].antwort + ". ";
	arztbrief+=obj["MedikamentenOpZeitverhaeltniss"+i].antwort + "";
	if(obj["MedikamentenOpNarkose"+i].antwort!=="ich war während der OP wach") {
		arztbrief+=", der Patient unterlag bei der Operation keiner Narkose, ";
	} else if(obj["MedikamentenOpNarkose"+i].antwort==="weiß ich nicht") {
		arztbrief+="(wobei sich der Patient nicht sicher ist, ob er einer Narkose unterlag)";
	} else {
		arztbrief+=", während derer der Patient mithilfe von " + obj["MedikamentenOpNarkose"+i].antwort + " anästhesiert wurde, ";
	}

	arztbrief+="traten " + obj["MedikamentenOPSymptome"+i].antwort + " auf. ";

	if(obj["MedikamentenOpNarkose"+i].antwort!=="ich war während der OP wach"&&
		obj["MedikamentenOpNarkose"+i].antwort!=="weiß ich nicht") {
		if(obj["MedikamentenOPNarkoseMed"+i].antwort==="Weiß ich nicht") {
			arztbrief+="Der Patient erinnert sich nicht mehr daran, welche Medikamente in und kurz vor der Narkose verwendet wurden. ";
		} else {
			arztbrief+="In und kurz vor der Narkose wurden " + obj["MedikamentenOPNarkoseMed"+i].antwort + " verwendet. ";
		}
	}

	if(obj["medikamentenbehandlung"+i].antwort==="keine Behandlung erfolgt") {
		arztbrief+="Auf diese Symptome erfolgte keine Behandlung. ";
	} else if(obj["medikamentenbehandlung"+i].antwort==="weiß ich nicht mehr") {
		arztbrief+="Der Patient erinnert sich nicht mehr, ob eine Behandlung erfolgt sei. ";
	} else {
		arztbrief+="Die Symptome wurden durch den " + obj["medikamentenbehandlung"+i].antwort + " behandelt. "
	}

	return arztbrief;
}

/*
	When the user tries to upload, perform the following steps:
	1. Collect the values changed by the user, write them back
	into obj
	2. Update the UI to reflect the change
	3. Upload the JSON string of the update object to the server
*/

function upload_data(e) {
	e.preventDefault();
	console.log("upload attempt");

	if(keys===undefined||obj===undefined)
		return;

	for(k=0; k<keys.length; k++) {
		updateelem=document.getElementById(keys[k])
		if(updateelem===null)
			continue;
		var updateval=updateelem.value;
		/* Entry has been changed */
		if(updateval!=="") {
			//console.log(updateval);
			/* Write the change back to obj */
			obj[keys[k]].antwort=updateval;
			/* Reflect the change in the table */
			//document.getElementById(keys[k]+"val").textContent=updateval;
		}
	}
	console.log(obj);
	$('#val_update').prepend('<span id="valupn" class="badge badge-info">Speichere Daten ab.</span>');

	/* POST request */
	$.ajax({
		  type: "POST",
		  url: "index.html",
		  data: JSON.stringify(obj),
		  dataType: "text",
		})
		.done(function( response ) {
        	$('#val_update').empty();
        	$('#val_update').prepend('<span id="valupn" class="badge badge-info">Daten erfolgreich abgespeichert.</span>');
        	setTimeout(function(){ $('#val_update').empty(); }, 10000);
        })
        .fail(function( data ) {
        	$('#val_update').empty();
        	$('#val_update').prepend('<span id="valupn" class="badge badge-warning">Fehler beim Abspeichern der Daten.</span>');
        	console.log('error ajax');
        	setTimeout(function(){ $('#val_update').empty(); }, 10000);
        });
}

/*
	Search for the pseudonym in the field input_pseud via a GET
	request to the server, when a result is returned, render the
	table again.

	The address for the GET request is ?pseud=THEPSEUDONYM
*/

function search_pseud(e) {
	e.preventDefault();
	var pseud=document.getElementById("input_pseud").value;
	$('#search_loader').css('display', 'inline-block');
	$('.bi-search').css('display', 'none');
	$.get("index.html", { pseud: pseud }, render_table);
}

function search_pseud_test() {
	var pseud=document.getElementById("input_pseud").value;
	$('#search_loader').css('display', 'inline-block');
	$('.bi-search').css('display', 'none');
	$.get("https://kap.jonh.eu/antwortentest.txt", {}, render_table);
}

/*
	Render the table given the data returned from the GET request
	to the server.

	@param data: A string containing a JSON list, containing the
	results of the search (can be empty). Each entry in the list
	has the format that the object obj has.

	@param status: the success status of the GET request
*/

function render_table(data, status) {
	$('#search_loader').css('display', 'none');
	$('.bi-search').css('display', 'inline-block');
	//console.log(data);
	
	if (!data) {
		jQuery('#kein_pseud_ergebnis').html('<span id="noresults" class="badge badge-warning">Kein Eintrag für das Pseudonym gefunden.</span>');

		return;
	}

	var allresults=JSON.parse(data);
	
	jQuery('#pid').html('Patient: ' + allresults.pseudonym.antwort + "<br>Alter: " + allresults.alter.antwort + "; Geschlecht: " + allresults.geschlecht.antwort);
	
	/* Remove the old table */

	res_body=document.getElementById("sticky_results_body");
	if(res_body!==null && res_body !==undefined) {
		res_body.remove();
	}
	res_body=document.getElementById("float_results_body");
	if(res_body!==null && res_body !==undefined) {
		res_body.remove();
	}
	warning=document.getElementById("noresults");
	if(warning!==null && warning!==undefined) {
		warning.remove();
	}

	//console.log(status)

	/* Deal with failure: zero or >1 results */
	if(data==="") {
		document.getElementById("server_error").innerHTML='<span id="noresults" class="badge badge-warning">Keine Ergebnisse für Pseudonym gefunden</span>';
		return;
	}

	var allresults=JSON.parse(data);

	//console.log(allresults);

	/* Set obj to the first result, if only one result has been returned */
	obj=allresults
	keys=Object.keys(obj);

	/* sort the keys by the priorityrity of the question */
	keys.sort(function(a,b) {
		if(obj[a].priority===undefined && obj[b].priority===undefined)
			return 0;
		else if(obj[a].priority===undefined)
			return 1;
		else if(obj[b].priority===undefined)
			return -1;
		else
			return obj[b].priority-obj[a].priority;
	});

	/* Write the new table, using the key as an ID for the input
	field, and keyval as an id for the field for showing the entry
	from the table */

	var table_string_sticky="<tbody id=\"sticky_results_body\">";
	var table_string_fix="<tbody id=\"float_results_body\">";

	for(k=0; k<keys.length; k++) {
		/* Skip the pseudonym, or if the relevant fields are undefined */
		if(keys[k]==="pseudonym" || keys[k]==="eingabensubmit" || keys[k]==="alter" || keys[k]==="geschlecht" ||
		   obj[keys[k]].frage===undefined ||
		   obj[keys[k]].antwort===undefined) {
			continue;
		}

		frage_reformat=obj[keys[k]].frage.replace(/</g, " ").replace("&&", "<br>");

		newelem='<tr';
		if (obj[keys[k]].priority < 0) {
			newelem += ' class="grayed"';
		}
		newelem += '>\
          <th scope="row">'+frage_reformat+'</th>\
          <th scope="row"><p id="'+keys[k]+'val">' + obj[keys[k]].antwort.replace(/</g, " ").replace(/,/g, ", ") +
          	'<a class="penedit float-right" style="cursor:pointer;" eid="'+ keys[k] + '"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-fill" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/></svg></a>\
        	</p>\
          	<textarea class="form-control" id="'+keys[k]+'" style="display:none;">'+ obj[keys[k]].antwort.replace(/</g, " ").replace(/,/g, ", ") + '</textarea>\
          </th>\
        </tr>';

		if(k<4) {
			table_string_sticky=table_string_sticky+newelem;
		} else {
			table_string_fix=table_string_fix+newelem;
		}
	}

	table_string_sticky=table_string_sticky+"</tbody>";
	table_string_fix=table_string_fix+"</tbody>";

	/* Enter the table string into the HTML document */
	document.getElementById("results_head_sticky").insertAdjacentHTML('afterend', table_string_sticky);
	document.getElementById("table_fix").insertAdjacentHTML('afterbegin', table_string_fix);
}
