package com.results_viewer;

import com.Dataroom.DataroomConnection;
import com.sun.net.httpserver.BasicAuthenticator;
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.InputStream;
import java.net.InetSocketAddress;

public class KapServer
{
	static final int port=8081;
	static final String passwordMessage="Please enter the username and password for the document server";
	//TODO insert password (can be freely selected - is required when opening the page)
	static final String kapServerPassword="";
	DataroomConnection dc;

	public static void main(String args[])
	{
		System.out.println("startup");
		DataroomConnection dc = new DataroomConnection();
		
		try
		{
			KapHttpHandler kapHttpHandler=new KapHttpHandler(dc);
			HttpServer server=HttpServer.create(new InetSocketAddress(port), 0);
			BasicAuthenticator kapAuthenticator=new BasicAuthenticator(passwordMessage) {
				@Override
				public boolean checkCredentials(String user, String pwd) {
					return pwd.equals(kapServerPassword);
				}
			};

			/* The client can land both on / and /index.html, and will be redirected */
			final HttpContext context1=server.createContext("/index.html", kapHttpHandler);
			final HttpContext context2=server.createContext("/", kapHttpHandler);

			/* They will also have to give the password */
			context1.setAuthenticator(kapAuthenticator);
			context2.setAuthenticator(kapAuthenticator);
			server.start();
		}
		catch (Throwable tr)
		{
			tr.printStackTrace();
		}
	}

}
