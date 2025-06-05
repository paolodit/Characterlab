<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0); // preflight request
}

// Read input
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['targetApiUrl']) || !isset($input['payload'])) {
    http_response_code(403);
    echo json_encode(["error" => "Invalid or missing targetApiUrl or payload"]);
    exit;
}

$targetUrl = $input['targetApiUrl'];
$payload = json_encode($input['payload']);

// Forward request to OpenAI (or other) endpoint
$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION']
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["error" => curl_error($ch)]);
} else {
    http_response_code($http_code);
    echo $response;
}
curl_close($ch);
