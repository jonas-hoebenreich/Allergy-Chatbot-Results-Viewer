package com.Dataroom;

public class DataroomConfiguration {
	
	private static String url = "https://dataroom.mri.tum.de";
	//TODO insert dataroom credentials (user & password)
	private static String usr = "";
	private static String pwd = "";
	private static String authUrl = "https://dataroom.mri.tum.de/api/v4/auth/login";
	
	private static int parent_id = 390035;
	private static String apiUrl = "/api/v4";
		
	protected static String getUrl() {return url;}
	protected static String getPwd() {return pwd;}
	protected static String getUsr() {return usr;}
	protected static String getAuthUrl() {return authUrl;}
	protected static int getParentId() {return parent_id;}
	protected static String getApiUrl() {return apiUrl;}

}
