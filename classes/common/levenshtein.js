


module.exports = function(db,field,synonyms,where) {
  
  var index,cache;
  
  if (synonyms==null) synonyms={};
  
  var reindex=function(){
    
    var all = where ? db.select(where) : db.getAll();
    
    if (all.recordsTotal==0) {
        setTimeout(reindex,200);
        return;
    }
    index={};
    cache={};
    
    for (var i=0; i<all.data.length; i++) {
        if (!all.data[i][field]) continue;
      
        var a=all.data[i][field].toLowerCase().split(' ');
        for (var j=0; j<a.length; j++) {
            var idx=a[j].trim();
            if (idx.length>1) {
                if (!index[idx]) index[idx]=[];
                index[idx].push(all.data[i]);
                if (synonyms && synonyms[idx]!=null) {
                    for (var k=0; k<synonyms[idx].length; k++) {
                        if (!index[synonyms[idx][k]]) index[synonyms[idx][k]]=[];
                        index[synonyms[idx][k]].push(all.data[i]);
                    }
                }
            }
        }
    }

  };
  
  reindex();
  db.trigger(field,reindex);
  

  var levenshtein = function(a, b){
    if(a.length == 0) return b.length; 
    if(b.length == 0) return a.length; 
  
    var matrix = [];
  
    // increment along the first column of each row
    var i;
    for(i = 0; i <= b.length; i++){
      matrix[i] = [i];
    }
  
    // increment each column in the first row
    var j;
    for(j = 0; j <= a.length; j++){
      matrix[0][j] = j;
    }
  
    // Fill in the rest of the matrix
    for(i = 1; i <= b.length; i++){
      for(j = 1; j <= a.length; j++){
        if(b.charAt(i-1) == a.charAt(j-1)){
          matrix[i][j] = matrix[i-1][j-1];
        } else {
          matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                  Math.min(matrix[i][j-1] + 1, // insertion
                                           matrix[i-1][j] + 1)); // deletion
        }
      }
    }
  
    return matrix[b.length][a.length];
  };
  
  var find = function(txt) {
    var t=txt.trim().replace(/ +/g,' ').toLowerCase().split(' ');
    
    var count=t.length;
    var results=[];
    for (var i=0; i<t.length; i++) {
        if (t[i].length<2) {
          count--;
          continue;
        }
        var a=[];
      
        if (cache[t[i]]==null) {
            cache[t[i]]=[];
            for (var k in index) {
                var lev=levenshtein(k,t[i]);
                if (lev==0 || (t[i].length==7 && lev==1) || (t[i].length>3 && lev==1 && !synonyms[k] && !synonyms[t[i]]) || (t[i].length>7 && lev==2) ) {
                    cache[t[i]]=cache[t[i]].concat(index[k]);
                }
            }
            
        }
        
        a=cache[t[i]];
          

        for (var j=0; j<a.length; j++) {
          var c=a[j][field].split(' ').length;
          results.push({rec: a[j], count:c});
        }
        
    }
    
    for (var i=0; i<results.length;i++) {
        if (!results[i].matches) results[i].matches=0;
        for (var j=0; j<results.length; j++) {
            if (!results[j].matches) results[j].matches=0;
            if (results[i].rec==results[j].rec && i!=j) {
                results[i].matches++;
                results[j].matches++;
            }
        }
    }
    
    results.sort(function(a,b){
      return b.matches-a.matches;
    });
    
    
  
    if (results.length==0) return null;
    
    var matches=results[0].matches;
    while (results[results.length-1].matches<matches) results.splice(results.length-1,1);
    
    
    results.sort(function(a,b){
      return (a.count-count) - (b.count-count);
    });
    
    var matchcount=Math.abs(results[0].matches-results[0].count);
    
    for (var i=0; i<results.length; i++) {
      
        if (Math.abs(results[i].matches-results[i].count)>matchcount) {
            results.splice(i,1);
            i--;
            continue;
        }
      
        for (var j=i+1; j<results.length; j++) {
            if (results[i].rec==results[j].rec) {
              results.splice(j,1);
              j--;
            }
        }
    }
    
    
    return results;
  };
  
  return {
    lev: function(a,b) {
      return levenshtein(a,b);
    },
    
    find: function(txt) {
      return find(txt);
    }
  }
}