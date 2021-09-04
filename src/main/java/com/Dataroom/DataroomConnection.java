package com.Dataroom;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileWriter;
import java.util.Scanner;

import com.google.gson.*;
import com.results_viewer.RedCapInterface;

/**
 * Handle Dataroom Connection
 * @author jonas
 *
 */
public class DataroomConnection {
	private String url;
	private String usr;
	private String pwd;
	private String authUrl;
	private int errorCount;
	
	private ArrayList<Integer> knownFiles;
	private FileWriter writer;
	
	private static int parent_id;
	private static String node;
	
	private String token;
	private HttpClient httpClient;
	Gson gson;
	
	public Thread t;	
	
	public DataroomConnection() {
		url = DataroomConfiguration.getUrl();
		usr = DataroomConfiguration.getUsr();
		pwd = DataroomConfiguration.getPwd();
		authUrl = DataroomConfiguration.getAuthUrl();
		parent_id = DataroomConfiguration.getParentId();
		node = DataroomConfiguration.getApiUrl();
		gson = new Gson();
		httpClient = HttpClient.newHttpClient();
		token = "";
		
		knownFiles = new ArrayList<Integer>();
		loadKnownFiles();
		
		t = new Thread() {
		    public void run() {
		        try {
		        	getAccessToken();
		        	while (true) {
		        		getFiles();
		        		Thread.sleep(300000);
		        	}
		        } catch(IOException | InterruptedException e) {
					e.printStackTrace();
					return;
				}
		    }  
		};

		t.start();
	}
	
	/**
	 * Load known files
	 */
	private void loadKnownFiles() {
	    try {
	        File file = new File("./files.txt");
	        Scanner r = new Scanner(file);
	        while (r.hasNextLine()) {
	          String data = r.nextLine();
	          switch (data) {
	          case "":
	        	  break;
	          default:
		          try {
		        	  knownFiles.add(Integer.parseInt(data));
		          } catch (NumberFormatException e) {
		        	  e.printStackTrace();
		          }
	          }
	        }
	        r.close();
	        
	      } catch (FileNotFoundException e) {
	        e.printStackTrace();
	      }
	}
	
	/**
	 * 
	 * @throws IOException
	 * @throws InterruptedException
	 */
    private void getAccessToken() throws IOException, InterruptedException {
    	  
        String inputJson = "{ \"login\":\"" + usr + "\", \"password\":\"" + pwd + "\", \"language\":1, \"authType\": \"sql\" }";
 
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(authUrl))
            .header("Content-Type", "application/json")
            .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:88.0) Gecko/20100101 Firefox/88.0")
            .header("Cookie", "WebUI=01; Core=01")
            .POST(HttpRequest.BodyPublishers.ofString(inputJson))
            .build();
  
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() == 200) {
        	token = gson.fromJson(response.body(), Token.class).getToken();
        	System.out.println(token);
        	errorCount = 0;
        } else {
        	handleErrorStatus(response);
        }
    }
    
    /**
     * @throws InterruptedException 
     * @throws IOException 
     * 
     */
    public int getFiles() throws IOException, InterruptedException {

    	HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url + node + "/nodes?depth_level=0&limit=10000&offset=0&parent_id=" + parent_id))
                .header("Content-Type", "application/json")
                .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:88.0) Gecko/20100101 Firefox/88.0")
                .header("Cookie", "WebUI=01; Core=01")
                .header("X-Sds-Auth-Token", token)
                .GET()
                .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        int r = 0;
        
        if (response.statusCode() == 200) {
            Contents contents = gson.fromJson(response.body(), Contents.class);
            
            for (Items i : contents.getItems() ) {
            	r += maybeAddNewFile(i);
            }
            errorCount = 0;
        } else {
        	handleErrorStatus(response);
        	getFiles();
        }
        
        return r;
        
        //System.out.println(response.statusCode());
        //System.out.println(response.body());
    }
    
    private int maybeAddNewFile(Items item) throws IOException, InterruptedException {
    	if (!knownFiles.contains(item.getId())) {
    		getFile(item.getId());
    		return 1;
    	}
    	return 0;
    }
    
    private boolean getFile(int id) throws IOException, InterruptedException {
    	HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url + node + "/nodes/files/" + id + "/downloads"))
                .header("Content-Type", "application/json")
                .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:88.0) Gecko/20100101 Firefox/88.0")
                .header("Cookie", "WebUI=01; Core=01")
                .header("X-Sds-Auth-Token", token)
                .GET()
                .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() == 200) {
        	
        	String p = gson.fromJson(response.body(), UserFile.class).getPseudonym();
        	System.out.println(id + " / " + p + ": "+ response.body().substring(0, Integer.min(response.body().length(), 25)) + "...");
        	RedCapInterface.createRecord(p, response.body());
        	
        	addToKnownFiles(id, p);
        	errorCount = 0;
        } else {
        	handleErrorStatus(response);
        	getFile(id);
        }
        
        return true;
    }
    
    private void addToKnownFiles(int id, String p) {
	    try {
	    	knownFiles.add(id);
	        writer = new FileWriter("./files.txt", true);
			writer.append( "\n" + id);
	        writer.flush();
	        writer.close();
	        
	        Path path = Paths.get("./js/pseudonyms.js");
	        List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
	        lines.add(6, "		{ value: \"" + p + "\", text: \""+ p + "\" },");
	        Files.write(path, lines, StandardCharsets.UTF_8);
	        /*
	        String s = ;
	        	        
	        writer = new FileWriter("./js/pseudonyms.js", true);
			writer.write( s );
	        writer.flush();
	        writer.close();
	        */
	      } catch (IOException e) {
	        e.printStackTrace();
	      }
    }
    
    private void handleErrorStatus(HttpResponse<String> response) throws IOException, InterruptedException {
    	System.err.println(response.statusCode());
    	System.err.println(response.body());
    	
    	if (errorCount > 12) {
    		errorCount = 10;
    	}
    	errorCount++;
    	
    	Thread.sleep(2^errorCount * 1000);

    	switch (response.statusCode()) {
    	case 401:
    		getAccessToken();
    		return;
    	default:
    		break;    		
    	}
    }
    
    /*
    public static void main(String[] args) {
		new DataroomConnection();
		return;
    }
    */
}

class Token {
	private String token;
	String getToken() {return token;}
}

class Contents {
	private Collection<Items> items;
	Collection<Items> getItems() {return items;};
}

class Items {
	private String name;
	private String createdAt;
	private int id;
	int getId() {return id;}
	String getName() {return name;}
	String getCreatedAt() {return createdAt;}
}

class UserFile {
	private UserPseudonym pseudonym;
	
	String getPseudonym() {return pseudonym.antwort;}
	
	class UserPseudonym {
		String antwort;
	}
}