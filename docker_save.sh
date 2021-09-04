#!/bin/bash

mvn package
mv target/results_viewer-1-jar-with-dependencies.jar results_viewer-1.jar
rm target/results_viewer-1.jar

sudo docker build -t results_viewer .
sudo docker rmi -f $(sudo docker images -qa -f 'dangling=true')
#sudo docker run -p 8081:8081 results_viewer:latest

sudo docker save results_viewer:latest >~/results_viewer.tar
#sudo docker import --change 'CMD ["/usr/local/openjdk-11/bin/java", "-jar", "/results_viewer.tar"]' ~/results_viewer.tar results_viewer1:latest
