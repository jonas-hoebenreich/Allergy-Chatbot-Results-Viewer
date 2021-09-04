Entwicklerdokumentation
========================

Abhängigkeiten
---------------

* Java 8+
* [Apache Maven 3.6.3+](https://maven.apache.org/)
* Libraries:
	* [org.apache.httpcomponents](https://mvnrepository.com/artifact/org.apache.httpcomponents)
	* [com.googlecode.json-simple](https://mvnrepository.com/artifact/com.googlecode.json-simple/json-simple)
* Plugins:
	* [exec-maven-plugin](https://www.mojohaus.org/exec-maven-plugin/)

Kompilieren
------------

Zum Kompilieren benötigt man nur eine Installation von Java 8 oder
höher und Apache Maven 3.6.3 oder höher, sowie eine Internetverbindung.

Dann wird die Software einfach durch das Kommando

	mvn compile

kompiliert.

Starten
--------

Zum Starten wird das Kommand

	mvn exec:java

oder

	java -jar ./results_viewer-1.jar

oder

	./start.sh

ausgeführt. Der Server wird damit auf dem Port 8080 auf localhost
gestartet. Man kann testen, ob der Server verfügbar ist, indem man die
Adresse `http://localhost:8080` aufruft.

Log-Nachrichten werden über stdout auf der Konsole ausgegeben.

Architektur
------------

![The pipeline of information from RedCap to the browser](./img/architecture.png)

Der Dokumentenserver fungiert als eine Schnittstelle zwischen client
und dem RedCap server.

Wenn der Nutzer nach einem Pseudonym sucht, wird ein GET request an
den Dokumenterserver gestellt, der wiederum einen POST-request an den
RedCap server stellt. Daraufhin wird das Ergebnis an den Dokumentenserver
zurückgesendet, und der reicht es an den Client weiter.

Wenn der Nutzer die Werte updated, wird ein POST request an den
Dokumentenserver geschickt. Der entpackt das JSON-Objekt, und sendet
einen Update-Request an den RedCap Server weiter.
