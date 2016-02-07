<?php

if( $_REQUEST['func'] == 'search' ) {
	$requests = json_decode(file_get_contents("php://input"), true);
	$request = $requests['requestObject'];
	$limitArray = array();
	$columnFilter = array();
	$whereArray = array();
	$orderArray = array();
	$indexColumn = 'id';
	$columns = array('name', 'parent','code', 'online');
	$iColumnCount = count($columns);

	/// Paging
	if (isset($request['iDisplayLength'])){
		if($request['iDisplayLength'] != '-1') {
			$limitArray = array($request['iDisplayStart'], $request['iDisplayLength']);
		}
	}

	/// Ordering
	/// Get Number of sorted columns
	$iSortingCols = intval( $request['iSortingCols'] );

	/// Global Filtering
	if ( isset($request['sSearch']) && $request['sSearch'] != "" ) {
		for ( $i=0 ; $i<$iColumnCount ; $i++ ) {
			$colData = $columns[$i];
			$whereArray[] = array( "key"=>$colData, "operator"=>"LIKE", "term"=>'%'.$request['sSearch'].'%', "type"=>"OR" );
		}
		$columnFilter =  $request['sSearch'];
	}

	/// Loop through column variables
	for ( $i=0 ; $i<$iSortingCols ; $i++ ) {
		/// If sorting on column is true
		if ( $request[ 'bSortable_'.intval($request['iSortCol_'.$i]) ] == 'true' ) {
			$key = $columns[intval( $request['iSortCol_'.$i] )];
			if( is_array( $key ) ){
				$newKey = $key['data'];
				$key = $newKey;
			}
			$orderArray[] = array( "key"=>$key, "direction"=>( $request['sSortDir_'.$i] === 'asc' ? 'ASC' : 'DESC' ) );
		}
	}

	/// Build SELECT
	$sql = "SELECT " . $indexColumn . ", " . implode( ', ', $columns ) . "
	FROM test";
	/// Build WHERE
	$sql_clause = "";
	if( count( $whereArray ) > 0 ) {
		$sql_clause .= "
		WHERE";
		for($i = 0; $i < count( $whereArray ); $i++ ) {
			$whereClause = $whereArray[$i];
			$sql_clause .= " " . $whereClause['key'] . " " . $whereClause['operator'] . " '" . $whereClause['term'] . "'
			" . $whereClause['type'];
			$lastType = $whereClause['type'];
		}
		/// Remove last type
		$sql_clause = substr( $sql_clause, 0, -(strlen( $lastType) ) );
	}
	/// Build ORDER BY
	$sql_order = "";
	if( count( $orderArray ) > 0 ) {
		$sql_order .= "
		ORDER BY ";
		for($i = 0; $i < count( $orderArray ); $i++ ) {
			$orderClause = $orderArray[$i];
			$sql_order .= $orderClause['key'] . " " . $orderClause['direction'];
		}
	}
	/// Build LIMIT
	$sql_limit = "";
	if( count( $limitArray ) > 0 ) {
		$sql_limit .= "
		LIMIT " . $limitArray[0] . ", " . $limitArray[1];
	}

	$mysql_host = "localhost";
	$mysql_user = "moridiweb";
	$mysql_password = "M0r1d1w3b";
	$database = "test";

	$link = mysql_connect( $mysql_host, $mysql_user, $mysql_password ) or die( 'Could not connect: ' . mysql_error() );
	mysql_select_db( $database ) or die( 'Could not select database' );

	$input = array();
	/// Performing SQL query
	$sql = $sql . $sql_clause . $sql_order;
	$result_all = mysql_query( $sql ) or die( 'Query failed: ' . mysql_error() . 'SQL: ' . $sql );
	$result = mysql_query( $sql . $sql_limit ) or die( 'Query failed: ' . mysql_error() . 'SQL: ' . $sql );
	if( mysql_num_rows( $result ) > 0 ) {
		$input['count'] = mysql_num_rows( $result );
		$input['totalCount'] = mysql_num_rows( $result_all );
		$input['data'] = array();
		while( $row = mysql_fetch_array( $result, MYSQL_ASSOC ) ) {
			$input['data'][] = $row;
		}
	}

	/// array format
	$output = array(
		"sEcho"                => intval($request['sEcho']),
		"iTotalRecords"        => $input['count'],
		"iTotalDisplayRecords" => $input['totalCount'],
		"sql"				   => $sql . $sql_limit,
		"aaData"               => array(),
		"allIds"			   => array()
	);

	/// Put data into DataTables format.
	if ( count( $input['data'] ) > 0 ){
		foreach ( $input['data'] as $row ) {
			$row["DT_RowId"] = $row[$indexColumn];
			$output['allIds'][] = $row[$indexColumn];

			if ( isset($row['class'] ) ) {
				$row["DT_RowClass"] = $row['class'];
			}

			$i = 0;
			foreach( $columns as $column ) {
				if( $column != $indexColumn ){
					if( !is_null( $row[$column] ) ) {
						$row[$i] = $row[$column];
					}else{
						$row[$i] = '';
					}
					unset($row[$column]);
					$i++;
				}
			}

			unset($row[$indexColumn]);
			unset($row['class']);
			$output['aaData'][] = $row;
		}
	}else{
		$output['aaData'] = array();
	}

	echo json_encode( $output );
	exit;
}