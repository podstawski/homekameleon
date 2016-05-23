<?php
    chdir(__DIR__);
    $url='https://docs.google.com/spreadsheet/ccc?key=1ygBmDAoScP0U8u43MYSySkok9L_TnlocQBT0EiJ4AhE&output=csv';
    $cmd="wget -q -O csv \"$url\"";
    //echo "$cmd\n";
    system($cmd);
	//die();
    
    $data=file_get_contents('csv');
    unlink ('csv');
    
    
    
    
    function przecinek2strumien($data)
    {
      static $len;
	
      $last_data=$data;
      while(true)
      {
          $data=preg_replace('/,"([^"]+),([^"]+)",*/',',"\\1ZJEBANY_PRZECINEK\\2",',$data);
          if ($last_data==$data) break;
          $last_data=$data;
      }
    
    
      $data=str_replace('"','',$data);
      $data=str_replace(',','~',$data);
      $data=str_replace('ZJEBANY_PRZECINEK',',',$data);
	
      while ($data[strlen($data)-1]=='~') $data=substr($data,0,strlen($data)-1);
      
      if (!$len) $len=substr_count($data,'~');
      
      if (substr_count($data,'~')!=$len)
      {
          $data=str_replace('~~','~',$data);
    
      }
	
      return $data;
    }
    
    
    
    $data=explode("\n",$data);
    $header=explode("~",przecinek2strumien(trim($data[0])));
  
    $langs=array();
    for($i=1;$i<count($data);$i++)
    {
        $line=explode("~",przecinek2strumien(trim($data[$i])));
        
        $label=$line[0];
        for ($j=1;$j<count($line);$j++)
        {
            if (!$line[$j]) continue;
            if (!isset($header[$j])) {print_r($line); die("J:$j\n".$data[$i]."\n".przecinek2strumien($data[$i]));}
            
            $langs[$header[$j]][$label]=$line[$j];
        }
        
    }
    
    
    
    foreach ($langs AS $lang=>$data)
    {
        if (!trim($lang)) continue;
        echo "Lang: $lang, ".count($data)." phrases.\n";
    }
    
    
    file_put_contents(__DIR__.'/public/assets/js/langs.json',json_encode($langs));
    
    $untranslated=json_decode(file_get_contents(__DIR__.'/data/langs'),true);
    
    foreach($untranslated AS $i=>$u) {
        if (isset($langs['en'][$u['label']])) unset($untranslated[$i]);
    }
    
    if(count($untranslated)) echo "\nTo be translated:\n\n";
    foreach($untranslated AS $u) {
        echo $u['label']."\n";
    }
    
    
    
