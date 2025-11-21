<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = "https://rumedia.io/media/admin-cp/manage-songs?check_pro=1";

// Ваш cookie
$cookie = "PHPSESSID=82013a22d081c9e1047758a92c04d081";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// Устанавливаем Cookie
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Cookie: $cookie",
    "User-Agent: Mozilla/5.0" // иногда требуется
]);

$response = curl_exec($ch);

if ($response === false) {
    echo json_encode([
        "error" => curl_error($ch)
    ]);
} else {
    echo $response;
}

curl_close($ch);
