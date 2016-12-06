<?php
include "db-config.php";

try {
    $db = new PDO($DB_DSN, $DB_USER, $DB_PASS);

    $query_result = $db->query("SELECT participation FROM $DB_TABLE WHERE participation is not null");
    $participations = $query_result->fetchAll(PDO::FETCH_COLUMN, 'participation');
    echo json_encode($participations);

    $db = null;
} catch(PDOException $e) {
    echo "error creating PDO " . $e;
    $db = null;
}


$conn = new mysqli("myServer", "myUser", "myPassword", "Northwind");

$result = $conn->query("SELECT CompanyName, City, Country FROM Customers");

$outp = "";
while($rs = $result->fetch_array(MYSQLI_ASSOC)) {
    if ($outp != "") {$outp .= ",";}
    $outp .= '{"Name":"'  . $rs["CompanyName"] . '",';
    $outp .= '"City":"'   . $rs["City"]        . '",';
    $outp .= '"Country":"'. $rs["Country"]     . '"}';
}
$outp ='{"records":['.$outp.']}';
$conn->close();

echo($outp);
?>
