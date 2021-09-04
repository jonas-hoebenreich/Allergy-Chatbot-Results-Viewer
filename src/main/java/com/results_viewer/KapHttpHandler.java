package com.results_viewer;

import com.Dataroom.DataroomConnection;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.InputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.HashSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.Set;
import java.util.ArrayList;

public class KapHttpHandler implements HttpHandler
{
	private DataroomConnection dc;
	private static final String[] WHITELIST={"/index.html",
		"/css/bootstrap.min.css",
		"/css/style.css",
		"/js/jquery.min.js",
		"/js/ResultViewer.js",
		"/js/bootstrap.bundle.min.js",
		"/js/pseudonyms.js",
		"/js/tom-select.js",
		"/css/tom-select.css",
		"/css/bootstrap.min.css.map",
		"/img/mri_logo.png"};

	public KapHttpHandler(DataroomConnection dc) {
		this.dc = dc;
	}

	/*
		The main Handler: receives an HTTP request and dispatches
		to either handleGetRequest() or handlePostRequest().
	*/
	public void handle(HttpExchange httpExchange) throws IOException
	{
		String pseudonym=null;
		if("GET".equals(httpExchange.getRequestMethod()))
		{
			System.out.println("in GET");
			pseudonym=getPseudonym(httpExchange);
			System.out.println(pseudonym);
			this.handleGetRequest(httpExchange, pseudonym);
		}
		else if("POST".equals(httpExchange.getRequestMethod()))
		{
			System.out.println("in POST");
			handlePostRequest(httpExchange);
			return;
		}
	}

	/*
		Having received a GET request, finds the pseudonym
		provided in the URI.

		@param httpExchange: the HTTP exchange
		@return: the pseudonym in the URI
	*/
	private String getPseudonym(HttpExchange httpExchange)
	{
		String pseud=null;
		String uri=httpExchange.getRequestURI().toString();
		Pattern p=Pattern.compile(".*\\?pseud=(.*)$");
		Matcher m=p.matcher(uri);
		if(m.find())
		{
			pseud=m.group(1);
			System.out.println(pseud);
		}
		return pseud;
	}

	/*
		Handle a POST request.
		When we receive a POST request, we convert it into a
		usable UTF-8 string (java has problems with having
		adopted UTF-16, we don't want to be fooled). After
		obtaining the string of the POST request, we search for
		the pseudonym using regular expressions (in JSON, yes,
		because we use only a subset). If we find a pseudonym
		in the data (which is pretty much guaranteed, unless
		there was deliberate tampering on the client side),
		we call RedCapInterface.putRecord with the pseudonym
		and the request data.

		@param httpExchange: the HTTP exchange we get the request
		body from
	*/
	private void handlePostRequest(HttpExchange httpExchange)
	{
		try {
			/* Obtain the byte array of the request body */
			Integer b;
			InputStream is=httpExchange.getRequestBody();
			ArrayList<Byte> bytes=new ArrayList<Byte>();

			while((b=is.read())!=-1) {
				bytes.add(b.byteValue());
			}

			is.close();

			byte[] bytesarray=new byte[bytes.size()];
			for (int i = 0; i < bytesarray.length; i++) {
				bytesarray[i] = bytes.get(i);
			}

			String requestdata=new String(bytesarray, "UTF-8");

			/* Some logging */
			//System.out.println(requestdata);
			System.out.println("POST request: " + requestdata.substring(0, Math.min(requestdata.length(), 256))+"...");
			
			if (requestdata.startsWith("dataroom-sync=1")) {
				
				String r = "{\"dataroomsyncresult\" :" + dc.getFiles() + "}";
				
				try {
					/* Respond to the client */
					OutputStream outputStream=httpExchange.getResponseBody();
					httpExchange.getResponseHeaders().add("content-type", "application/json; charset=UTF-8");
					httpExchange.sendResponseHeaders(200, r.length());
					outputStream.write(r.getBytes());
					outputStream.flush();
					outputStream.close();
				} catch(Exception e) {
					e.printStackTrace();
				}
			} else {
				/* Find the pseudonym in the body */
				Pattern pattern=Pattern.compile("\"antwort\":\"([a-zA-Z0-9]+)\"");
				Matcher matcher=pattern.matcher(requestdata.substring(requestdata.indexOf("\"pseudonym\":")));
				if(matcher.find()) {
					int success=400;
					String retval="failure";
					System.out.println("Found pseudonym: " + matcher.group(1));
					String id=RedCapInterface.getPatientId(matcher.group(1));
					boolean b1, b2;
					b1=RedCapInterface.putRecord(matcher.group(1), requestdata, id);
					b2=RedCapInterface.putReport(matcher.group(1), requestdata, id);
					if(b1&&b2) {
						success=200;
						retval="success";
					}
					try {
						System.out.println("Responding with " + retval);
						/* Respond to the client */
						OutputStream outputStream=httpExchange.getResponseBody();
						httpExchange.getResponseHeaders().add("content-type", "application/json; charset=UTF-8");
						httpExchange.sendResponseHeaders(success, retval.length());
						outputStream.write(retval.getBytes());
						outputStream.flush();
						outputStream.close();
					} catch(Exception e) {
						e.printStackTrace();
					}
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	/*
		Handles GET requests to the server.
		Specifically, we restrict the available files to a known
		whitelist of files, so that noone can do any damage.
		If the client wants only a file on the server, we return that
		file, otherwise we see whether a pseudonym was provided and
		search for it using RedCapInterface.getReport().

		@param httpExchange: the HTTP exchange
		@param pseudonym: the pseudonym requested
	*/

	private void handleGetRequest(HttpExchange httpExchange, String pseudonym) {
		Set<String> whitelist=new HashSet<String>();
		OutputStream outputStream=httpExchange.getResponseBody();
		String location=httpExchange.getRequestURI().toString();
		String type="";
		byte[] bs;

		System.out.println(location);

		whitelist.addAll(Arrays.asList(WHITELIST));

		if(!whitelist.contains(location)) {
			/* Default / to index.html */
			location="/index.html";
		}

		try {
			/* The icon must be treated specially, because we don't read the string, but the bytes */
			if(location.endsWith(".png")) {
				bs=Files.readAllBytes(Paths.get("." + location));
			} else {
				bs=Files.readString(Paths.get("." + location)).getBytes("UTF-8");
			}
		} catch(IOException e) {
			e.printStackTrace();
			return;
		}

		/* Set content types depending on file extension */
		if(location.endsWith(".html")) {
			type="text/html";
		} else if (location.endsWith(".css")) {
			type="text/css";
		} else if (location.endsWith(".js") || location.endsWith(".map")) {
			type="application/javascript";
		} else if (location.endsWith(".png")) {
			type="image/png";
		} else {
			type="application/octet-stream";
		}
		if(pseudonym!=null) {
			type="text/plain";
			try {
				bs=RedCapInterface.getReport(pseudonym).getBytes("UTF-8");
			} catch (Exception e) {
				e.printStackTrace();
				return;
			}
		}

		httpExchange.getResponseHeaders().add("Content-Type", type+"; charset=UTF-8");
		try {
			/* Respond to the client */
			httpExchange.sendResponseHeaders(200, bs.length);
			outputStream.write(bs);
			outputStream.flush();
			outputStream.close();
		} catch(Exception e) {
			e.printStackTrace();
		}
	}
}
