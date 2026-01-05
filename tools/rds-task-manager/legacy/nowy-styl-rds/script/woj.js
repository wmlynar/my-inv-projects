
function log(param)
{
    let message = JSON.parse(param)["eventData"]
    jj.scriptLog("INFO", "log", message)
}

function setTaskVariables_getNextDropsiteMultipleGroups_Blocking(param) {
    var paramObj = JSON.parse(param)["eventData"];
    var paramObj = JSON.parse(paramObj);
    jj.scriptLog("INFO", "log", paramObj)
    if (!paramObj || !paramObj.groupNames || !paramObj.ordering || !paramObj.resultField) {
        jj.scriptLog(
            "ERROR", 
            "setTaskVariables_nextDropsite_Blocking", 
            "Missing groupNames, ordering or resultField parameters: " + param
        );
        return null;
    }
    let nextDropsite = getNextDropsiteMultipleGroups_Blocking(paramObj.groupNames, paramObj.ordering);
    
    // Tworzymy obiekt z dynamicznie ustawioną nazwą pola
    let resultJson = {};
    resultJson[paramObj.resultField] = nextDropsite;
    
    return {result: JSON.stringify(resultJson)};
}

function getNextDropsiteMultipleGroups_Blocking(groupNames, ascdesc) {
    while(true) {
        var result = getNextDropsiteMultipleGroups(groupNames, ascdesc);
        if(result != null) {
            return result;
        }
        jj.sleep(100);
    }
}

function getNextDropsiteMultipleGroups(groupNames, ascdesc) {
    // Iterujemy po każdej grupie i wywołujemy dla niej getNextDropsite
    for (var i = 0; i < groupNames.length; i++) {
        let groupName = groupNames[i];
        var result = getNextDropsite(groupName, ascdesc);
        if(result != null) {
            return result;
        }
    }
    // Jeśli żadna grupa nie ma wolnego miejsca, zwracamy null
    return null;
}


function getNextDropsite(groupName, ascdesc) {
    var condition = { "groupNames": [groupName] };
    var sitesStr = jj.findSitesByCondition(JSON.stringify(condition), ascdesc);
    
//    jj.scriptLog("INFO", "getNextWorksite", sitesStr);

    // Jeśli wogole nie znaleziono miejsc, zwracamy null
    if (sitesStr === null) {
        return null;
    }

    var sites = JSON.parse(sitesStr);
    if (!sites || sites.length === 0) {
        return null;
    }

    // Jezeli pierwszy element na liście zajety to nie ma wolnych miejsc
    if (!(sites[0].filled === 0 && sites[0].locked === 0 && sites[0].disabled === 0)) {
        return null;
    }
    
    // W przeciwnym wypadku znajdujemy pierwszy zajety element i zwracamy poprzedni
    for (var i = 1; i < sites.length; i++) {
        if (!(sites[i].filled === 0 && sites[i].locked === 0 && sites[i].disabled === 0)) {
            return sites[i - 1].siteId;
        }
    }
    
    // Jeśli na całej liście nie znaleziono zajętego obiektu to zwracamy ostatni element
    return sites[sites.length - 1].siteId;
}


