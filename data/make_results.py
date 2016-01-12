#gets data from a user"s top ten favorite games
import sys
import re
reload(sys)
sys.setdefaultencoding('utf-8')

import string
import json
import requests
import HTMLParser

html_parser = HTMLParser.HTMLParser()

#set tTitles, a map of titles to their steam APP IDs
tTitles = {}
def mapTitles(jsonData):
    for app in jsonData:
        tTitles[app["name"]] = app["appid"]
with open("titles.json") as data_file:
    mapTitles(json.load(data_file)["applist"]["apps"]["app"])

tObjects = []
#given a json game, returns the stuff we want
tLinks = []

#set gameRecommendations, a map of titles to their recommendations
gameLib = {}
def mapGameLib(jsonData):
    for game in jsonData:
        gameLib[game["id"]] =  game["recommendations"]
with open("game_library.json") as data_file:
   mapGameLib(json.load(data_file)) 

#fixes formatting of recommendation
def removeBadThings(description):
    description = re.sub(r'<img src=(.*?)>', "", description)
    description = re.sub(r'\"', '\'', description)

    return description

def addObject(request, level):
        fObject = {}
        fObject["title"] = str(request["name"])
        fObject["label"] = fObject["title"]
        fObject["steam_id"] = str(request["steam_appid"])
        fObject["description"] = removeBadThings(request["detailed_description"].encode("ascii", "ignore"))
        fObject["cover"] = str(request["header_image"])
        if "website" in request:
            fObject["website"] = str(request["website"])
        if "price_overview" in request:
            fObject["price"] = str(request["price_overview"]["final"])
        if "metacritic" in request:
            fObject["rating"] = {}
            fObject["rating"]["score"] = request["metacritic"]["score"]
            fObject["rating"]["url"] = str(request["metacritic"]["url"])
        else:
            return None

        fObject["genres"] = []
        for genre in request["genres"]:
            ngenre = {}
            ngenre["id"] = str(genre["id"])
            ngenre["description"] = str(genre["description"])
            fObject["genres"].append(ngenre)
        fObject["recommendations"] = str(request["recommendations"]["total"])

        fObject["level"] = level 

        fObject["id"] = len(tObjects)
        tObjects.append(fObject)

        fObject["links"] = []
        print(level)
        #only level one get links
        if level < 2:
            success = setLinks(fObject)
            if success is None:
                #print("Links failed for " + fObject["title"])
                return None
        #print(fObject["title"] + " parsed.")
        return fObject

def cutName(fObjectName):
    #get rid of weird symbols
    newObjectName = filter(lambda x: x in string.printable, fObjectName)

    #if the last symbol is a non-alphanumeric, remove that
    if newObjectName == fObjectName:
        while (not newObjectName[-1].isalnum()):
            newObjectName = newObjectName[:len(newObjectName) - 1]
    #remove the last word
    if newObjectName == fObjectName:
        newObjectName = fObjectName.rsplit(' ', 1)[0]

    return newObjectName

#if game is not in our library, we add it
def requestGame(steamID, gameTitle):
    print("Requesting " + gameTitle)

    idParams = {"q": gameTitle, "k": "187070-SteamRec-O6Z9YASS", "type" : "game:", "info" : "1"}
    base = "https://www.tastekid.com/api/similar?"

    request = requests.get(base, params = idParams, verify=False)

    #we get the result for this game
    data = request.json()["Similar"]["Results"]
    if len(data) == 0:
        print("Nothing found")
        newName = cutName(gameTitle)
        #if empty, we remember that this game yielded zero results
        if newName == '':
            print("Added " + originalGameTItle + " with zero results")
            gameLib[steamID] = {}
            return
        #else, we search again
        requestGame(steamID, newName)
    #we found some similar results!
    else:
        print("Found recommendations for " + gameTitle)
        #set the data
        recommendations = []
        #add all the recommendations to the list
        for game in data:
            print("added recommendation " + game["Name"])
            recommendations.append(game["Name"])

        gameLib[steamID] = recommendations
        print(gameLib[steamID])

        return;

def setLinks(fObject): 
    #print ("Setting links for " + fObject["title"])
    gameTitle = html_parser.unescape(fObject["title"])
    steamID = fObject["steam_id"] 
    #if not in our library yet, we add it to the library
    if steamID not in gameLib.keys():
        print("game " + gameTitle + " not in lbirary yet")
        for game in gameLib:
            print("library: " + game)
        requestGame(steamID, gameTitle)

    maxNumGames = 5
    curNumGames = 0

    #iterate through all games
    weight = 1
    for game in gameLib[steamID]:
        print("Iterating through " + game)
        if curNumGames == maxNumGames:
            break

        id = getGame(game)
        #print("ID of " + game["Name"] + " is " + str(id))

        #if the game already exists in the database, we add a link
        if id > 0:
            makeLink(fObject, tObjects[id], weight)
            curNumGames = curNumGames + 1

        #else, we make a new object and add a link
        else:
            nTitle = game
            if nTitle in tTitles:
                nObjectID = setObject(tTitles[nTitle], fObject["level"] + 1) 
                
                if nObjectID > -1:
                    makeLink(fObject, tObjects[nObjectID], weight)
                    curNumGames = curNumGames + 1

        weight = weight - (.1 * weight)

    return []

def makeLink(fObject, nObject, weight):
    fObject["links"].append(nObject["id"])
    nObject["links"].append(fObject["id"])
    
    nLink = {}
    nLink["source"] = fObject["id"]
    nLink["target"] = nObject["id"]
    nLink["weight"] = str(weight)

    tLinks.append(nLink)

#searches tObjects for a game and returns ID
def getGame(title):
    for tObject in tObjects:
        if tObject["title"] == title:
            return tObject["id"]
    return -1

#gets a request from the api and returns a JSON object with the necessary strings
def getObject(appID):
        idParams = {"appids": appID}
        base = "http://store.steampowered.com/api/appdetails"
        request = requests.get(base, params=idParams)
           
        return (request.json()[str(appID)])        
 
def getUserGames(userID):
        idParams = {"key": "B820C0655B63E2F4C8947D1F3B0A3E90", "steamid": userID, "format" : "json"}
        base = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/"

        request = requests.get(base, params=idParams)
        return request.json()

def setObject(appID, level):
    #print("Setting object with id " + str(appID))
    object = getObject(appID)

    if (object["success"] is True):
        fObject = addObject(object["data"], level)
        if fObject is None:
            return -1

        return fObject["id"]

    return -1

def main():
    userID = 76561198008637711
    #userID =76561198060927907
    data = getUserGames(userID)
    #get games
    games = data["response"]["games"]

    #sort by playtime
    games = sorted(games, key=lambda k: k["playtime_forever"], reverse=True)
    #crop length if greater than 10
    maxNumGames = 1;
    curNumGames = 0;

    for game in games:
        if curNumGames == maxNumGames:
            break

        if setObject(game["appid"], 1) > 0:
            curNumGames = curNumGames + 1

    result = {}
    
    result["nodes"] = tObjects
    result["links"] = tLinks

    print("Printing game library now.")
    for game in gameLib:
        print game
        print gameLib[game]
    #write to file "results_123542.json"
    fileName = "results_" + str(userID) + ".json"
    f = open(fileName, 'w')
    f.write(json.JSONEncoder().encode(result))
    f.close()

    #update game library
    gameLibrary = []
    for game in gameLib:
        newGame = {}
        print(game + " IS IN GAME LIB")
        newGame["id"] = game
        newGame["recommendations"] = gameLib[game]
        gameLibrary.append(newGame)

    print("final library")
    print(gameLibrary)

    f = open('game_library.json', 'w')
    f.write(json.JSONEncoder().encode(gameLibrary))
    f.close()

main()
