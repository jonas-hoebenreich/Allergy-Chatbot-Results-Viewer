package com.results_viewer;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.net.UnknownHostException;

import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.mime.content.FileBody;
import org.apache.http.entity.mime.content.StringBody;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.http.HttpEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.NameValuePair;
import org.apache.http.util.EntityUtils;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

public class RedCapInterface {

    //TODO insert Redcap API token
	static final String API_TOKEN="";
	static final String API_URL="http://10.6.16.239/redcap/api/"; //MRI Intranet

	/*
		Gets the JSON file containing all answers from the server
		(not the individual fields). This is separate because RedCap
		prohibits too long strings from being saved to a text field,
		so we have to save the whole file.

		@param p: String, the pseudonym
	*/
	public static String getReport(String p) {
		String recordnum=getPatientId(p);
		if(recordnum==null) {
			return "";
		}

		/* Set request parameters */
		List<NameValuePair> params = new ArrayList<>();
		params.add(new BasicNameValuePair("token", API_TOKEN));
		params.add(new BasicNameValuePair("content", "file"));
		params.add(new BasicNameValuePair("action", "export"));
		params.add(new BasicNameValuePair("field", "report"));
		params.add(new BasicNameValuePair("record", recordnum));
		params.add(new BasicNameValuePair("event", "online_anamnese_arm_1"));
		params.add(new BasicNameValuePair("filterLogic", "[pseudonym]='"+p+"'"));

		/* As always, POST to server */
		String result=performPost(params);
		return result;
	}

	/*
		Put the report (the JSON file with the answers) to the server.
		Again, disregard the individual fields.
		We don't save the file from disk, but just the byte array generated
		from c.

		@param p: the pseudonym
		@param c: the string for the report
		@param id: the RedCap id for the patient
	*/
	public static boolean putReport(String p, String c, String id) {
		System.out.println("Beginning of putReport");
		MultipartEntityBuilder multipartEntityBuilder = MultipartEntityBuilder.create();
		multipartEntityBuilder.addBinaryBody(
			"file", c.getBytes(),
			ContentType.create("application/octet-stream"),
			"report.json"
		);

		multipartEntityBuilder.addTextBody("token", API_TOKEN);
		multipartEntityBuilder.addTextBody("content", "file");
		multipartEntityBuilder.addTextBody("action", "import");
		multipartEntityBuilder.addTextBody("record", id);
		multipartEntityBuilder.addTextBody("field", "report");
		multipartEntityBuilder.addTextBody("event", "online_anamnese_arm_1");

		HttpEntity httpEntity=multipartEntityBuilder.build();
		HttpPost httpPost=new HttpPost(API_URL);
		try {
			httpPost.setEntity(httpEntity);
		} catch(final Exception e) {
			e.printStackTrace();
			return false;
		}
		String s=postToServer(httpPost);
		System.out.println("Result of putReport: " + s);
		return !s.equals("");
	}

	/*
		Obtain the content of the record with the pseudonym p
		from RedCap.
		Do this by combining the basic name-value pairs into a
		request, and filtering for the patient_id field (which
		is the unique identifier, and also the pseudonym).
		If no result is found, return the string "[]", which
		will just be forwarded to the client and means that
		no result for the pseudonym was found.

		@param p: the pseudonym/unique identifier for the patient
	*/
	public static String getRecord(String p) {
		System.out.println("Beginning of getRecord()");
		/* Set request parameters */
		List<NameValuePair> params = new ArrayList<>();
		params.add(new BasicNameValuePair("token", API_TOKEN));
		params.add(new BasicNameValuePair("content", "record"));
		params.add(new BasicNameValuePair("format", "json"));
		params.add(new BasicNameValuePair("type", "flat"));
		params.add(new BasicNameValuePair("filterLogic", "[pseudonym]='"+p+"'"));

		String result=performPost(params);
		if(result.equals("")) {
			return "[]";
		}
		return result;
	}

	/*
		Create the record with the name p.
		First, we find out what the next id is, then we upload
		c to that record. Then we add the report as a file.

		@param p: the pseudonym of the newly generated field.
		@param c: the content for the "report" field
	*/
	public static void createRecord(String p, String c) {
		System.out.println("Beginning of createRecord()");
		int respcode=-1;
		String line="";

		List<NameValuePair> params=new ArrayList<NameValuePair>();
		params.add(new BasicNameValuePair("token", API_TOKEN));
		params.add(new BasicNameValuePair("content", "generateNextRecordName"));

		String id=performPost(params);

		if(!id.equals("")) {
			putRecord(p, c, id);
			putReport(p, c, id);
		}
	}

	/*
		Write the content c to RedCap entry p.
		1. Create the parameters for the POST request
		2. Send the POST request
		3. Report the response
		@param p: the pseudonym/unique identifier in the RedCap records
		@param c: the content being written to the server
		@param id: the id of the record, "" (the empty string) if unknown
	*/
	public static boolean putRecord(String p, String c, String id) {
		System.out.println("Beginning of putRecord()");
		int respcode=-1;
		String line="";

		/* Compute the parameters of the POST request, possibly writing to individual fields */
		List<NameValuePair> params=getParams(p, c, id, true);

		if(params==null) {
			System.out.println("No record with corresponding pseudonym found");
			return false;
		}

		return !performPost(params).equals("");
	}

	/*
		Find the ID for the patient with pseudonym p using getRecord().
		@param p: The pseudonym of the patient.
		@return: The id of the patient with pseudonym p, null if none found.
	*/
	public static String getPatientId(String p) {
		/* Find the patient id of the patient with pseudonym p */
		String body=getRecord(p);

		Pattern ptrn=Pattern.compile("\\[\\{\"patient_id\":\"([0-9]+)\",");
		Matcher m=ptrn.matcher(body);

		if(!m.find()) {
			return null;
		}
		return m.group(1);
	}

	/*
		Compute the parameters for the request, based on the
		JSON contents handed down from the client.
		Optionally, perform field-wise updating on RedCap.
		@param p: the pseudonym/unique identifier used in the request
		@param c: String containing the JSON handed down from the client
		@param id: the id of the record for which the parameters are being generated, "" if unknown
		@param fieldwise: whether every single field on RedCap should be updated, or only "report"

		@return: A list of name-value pairs that contains the parameters for the request,
		null if the pseudonym doesn't refer to any record.
	*/
	private static List<NameValuePair> getParams(String p, String c, String id, boolean fieldwise) {
		JSONObject record=new JSONObject();

		if(id.equals("")) {
			id=getPatientId(p);
		}

		if(id==null) {
			return null;
		}

		/* standard parameters */
		record.put("patient_id", id);
		record.put("pseudonym", p);
		record.put("redcap_event_name", "online_anamnese_arm_1");

		/* Fields must exist in advance, they can't be created
		by writing.  However, that's not a big problem. */

		if(fieldwise) {
			/* This is a bit ugly, but _should_ work.*/
			/* TODO: when can this fail?*/
			String[] paramsplit=c.split("},");

			for(String s: paramsplit) {
				/* Find the fieldname and the answer */
				Pattern pattern=Pattern.compile("\"([0-9a-zA-Z_]+)\":.*\"antwort\":\"([^\"]+)\"");
				Matcher matcher=pattern.matcher(s);

				/* add the parameter */
				if(matcher.find()) {
					record.put(matcher.group(1), matcher.group(2));
				}
			}
		}

		JSONArray data=new JSONArray();
		data.add(record);

		/* Redcap-relevant parameters, we definitely want to overwrite a bunch */
		List<NameValuePair> params = new ArrayList<>();
		params.add(new BasicNameValuePair("token", API_TOKEN));
		params.add(new BasicNameValuePair("content", "record"));
		params.add(new BasicNameValuePair("format", "json"));
		params.add(new BasicNameValuePair("type", "flat"));
		params.add(new BasicNameValuePair("data", data.toJSONString()));
		params.add(new BasicNameValuePair("overwriteBehavior", "overwrite"));

		return params;
	}

	/*
		Perform a POST request to the server given the parameters for the request.

		@param params: the parameters for the request, such as
		the format of data, the type of data etc.

		@return: if the HTTP code from the server was 200, return
		the return string, otherwise return the empty string ""
	*/
	private static String performPost(List<NameValuePair> params) {
		HttpPost httpPost = new HttpPost(API_URL);
		httpPost.setHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");

		System.out.println("Sending as POST request: " + params.toString().substring(0, Math.min(params.toString().length(), 256))+"...");

		try {
			/* Avoid unicode kerfuffle */
			httpPost.setEntity(new UrlEncodedFormEntity(params, "UTF-8"));
		} catch (final Exception e) {
			e.printStackTrace();
			return "";
		}
		return postToServer(httpPost);
	}

	/*
		POST the parameters from performPost() to the server
		(now for real).  Separated so that we can accept
		different kinds of parameters (i.e.  Multi parameters
		for POSTing the JSON file, or just regular parameters
		given to performPost().

		@param httpPost: the post request.
	*/
	private static String postToServer(HttpPost httpPost) {
		int respcode=-1;
		String line="";

		StringBuffer result=new StringBuffer();
		BufferedReader reader=null;
		CloseableHttpClient httpclient = HttpClients.createDefault();

		try (CloseableHttpResponse response = httpclient.execute(httpPost)) {
			/* get response code ...*/
			if(response != null) {
				respcode = response.getStatusLine().getStatusCode();
				reader = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
			}
			/* ... and response content */
			if (reader != null) {
				while((line=reader.readLine()) != null) {
					result.append(line);
				}
			}
		}
		catch (final Exception e) {
			e.printStackTrace();
		}

		/* logging */
		System.out.println("POST request response code: " + respcode);
		System.out.println("POST request response: " + result.toString().substring(0, Math.min(result.toString().length(), 256))+"...");

		String res;

		if(respcode==200 && result.toString().equals("")) {
			res="dummy";
		} else if(respcode==200) {
			res=result.toString();
		} else {
			res="";
		}

		return res;
	}
}
