<?php
    
    $homiq_dir=dirname(__FILE__).'/../..';
    require ($homiq_dir.'/db.class.php');
    
    $file=$homiq_dir.'/homiq.ini';
	$ini=parse_ini_file($file,true);
    
    $outputs=[];
    $inputs=[];
    $ios=[];
	$actions=[];
	$scenarios=[];
	
	$outps=[];
    
    $adodb=new HDB($ini['database']['type'],$ini['database']['host'], $ini['database']['user'], $ini['database']['pass'], $ini['database']['name']);

    $sql="SELECT * FROM modules WHERE m_active=1";
	$res=$adodb->execute($sql);
    if ($res) for ($i=0;$i<$res->RecordCount();$i++)
    {
        parse_str($adodb->ado_ExplodeName($res,$i));
        
        if ($m_type=='O') {
            $ios[]=[
                'id'=>$m_symbol,
                'device'=>'HQP',
                'address'=>$m_adr,
                'serial'=>$m_serial,
                'name'=>$m_name,
                'active'=>1
            ];
        } elseif ($m_type=='R') {
            $outputs[]=$outps[$m_adr]=[
                'id'=>$m_symbol,
                'device'=>'HQP',
                'address'=>$m_adr,
                'serial'=>$m_serial,
                'name'=>$m_name,
                'state'=>$m_state,
                'timeout'=>$m_sleep,
                'active'=>1
            ];
        } elseif ($m_type=='I') {
            $outputs[]=[
                'id'=>$m_symbol,
                'device'=>'HQP',
                'address'=>$m_adr,
                'serial'=>$m_serial,
                'name'=>$m_name,
                'state'=>'',
                'active'=>1
            ];
        }
        //echo $adodb->ado_ExplodeName($res,$i);break;
    }

	
	
    $sql="SELECT * FROM outputs";
	$res=$adodb->execute($sql);
    if ($res) for ($i=0;$i<$res->RecordCount();$i++)
    {
        parse_str($adodb->ado_ExplodeName($res,$i));
        
        $outputs[]=$outps[$o_module.'.'.$o_adr]=[
            'id'=>$o_symbol,
            'device'=>'HQP',
            'address'=>$o_module.'.'.$o_adr,
            'parent'=>$o_module,
            'name'=>$o_name,
            'state'=>0,
			'logicalstate'=>'off',
            'timeout'=>$o_sleep,
            'type'=>$o_type,
            'active'=>$o_active
        ];
        //echo $adodb->ado_ExplodeName($res,$i);break;
    }
    

    $sql="SELECT * FROM inputs";
	$res=$adodb->execute($sql);
    if ($res) for ($i=0;$i<$res->RecordCount();$i++)
    {
        parse_str($adodb->ado_ExplodeName($res,$i));
        
        $inputs[]=[
            'id'=>$i_symbol,
            'device'=>'HQP',
            'address'=>$i_module.'.'.$i_adr,
            'parent'=>$i_module,
            'name'=>$i_name,
            'state'=>$i_state,
            'type'=>$i_type,
            'active'=>$i_active
        ];
		
		
        //echo $adodb->ado_ExplodeName($res,$i);break;
    }


	$act=[];
    $sql="SELECT * FROM action ORDER BY a_pri,a_id";
	$res=$adodb->execute($sql);
    if ($res) for ($i=0;$i<$res->RecordCount();$i++)
    {
        parse_str($adodb->ado_ExplodeName($res,$i));
        
		for ($p=0;$p<16;$p++) {
			if (pow(2,$p)==$a_input_adr) {
				$idx=$a_input_module.'.'.$p;
				
				$output_addr=$a_output_module;
				if (strlen($a_output_adr)) $output_addr.='.'.$a_output_adr;
				
				
				$cond=[];
				$s=strlen($output_addr)?'A-'.$a_id:'';
				
				if (strlen($a_input_module_state)) {
					if ($a_input_module_state=='0' || $a_input_module_state=='1') {
						$c=['logicalstate','=',$a_input_module_state?'on':'off'];
					} else {
						$c=['state','=',$a_input_module_state];
					}
					$cond[]=[
						'db'=>'outputs',
						'device'=>'HQP',
						'address'=>$output_addr,
						'condition'=> $c
					];
				}
				if (strlen($a_input_state)) {
					$cond[]=[
						'db'=>'inputs',
						'device'=>'HQP',
						'address'=>$a_input_module.'.'.$p,
						'condition'=> [
							'state','=',$a_input_state
						]
					];
				}

				$delay=0;
				if ($a_sleep>0) $delay=$a_sleep;
				if ($a_sleep==-1) {
					if (isset($outps[$output_addr])) $delay=$outps[$output_addr]['timeout']+0;
				}
				
				$cmd=$a_output_state;
				if ($a_output_state=='1' || $a_output_state=='0') {
					$cmd=$a_output_state?'turnon':'turnoff';
				}
				if ($a_output_state=='u') $cmd='up';
				if ($a_output_state=='d') $cmd='down';
				if ($a_output_state=='U') $cmd='stop-u';
				if ($a_output_state=='D') $cmd='stop-d';
				
				
				if ($s) {
					$scenarios[]=[
						'id'=>$s,
						'name'=>$a_name,
						'conditions'=>[],
						'active'=>true,
						'actions'=> [[
							'device'=>'HQP',
							'address'=>$output_addr,
							'command'=>$cmd,
							'delay'=>$delay
						]]
					];
				}
				
				$a=['active'=>$a_active,'conditions'=>$cond,'scenarios'=>$s?[['scenario'=>$s]]:[]];
				
				if (strlen($a_macro)) $a['scenarios'][]=['scenario'=>$a_macro];
				
				if (!isset($act[$idx])) $act[$idx]=['device'=>'HQP','address'=>$idx,'actions'=>[]];
				$act[$idx]['actions'][]=$a;
			}
		}
		
   
		
		
        //if (1|| $a_id==388) {print_r(explode('&',$adodb->ado_ExplodeName($res,$i)));break;}
    }

	foreach ($act AS $a) $actions[]=$a;

	//die(print_r(['a'=>$actions,'s'=>$scenarios],1));

    
    
	file_put_contents(__DIR__.'/conf/inputs.json', json_encode($inputs));
	file_put_contents(__DIR__.'/conf/outputs.json', json_encode($outputs));
	file_put_contents(__DIR__.'/conf/ios.json', json_encode($ios));
	file_put_contents(__DIR__.'/conf/actions.json', json_encode($actions));
	file_put_contents(__DIR__.'/conf/scenarios.json', json_encode($scenarios));
	
    
    //print_r([$ios,$outputs,$inputs]);