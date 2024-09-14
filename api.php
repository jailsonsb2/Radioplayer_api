<?php

// Configuração de exibição de erros
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// URLs permitidas para acesso (se a verificação de URL estiver habilitada)
$allowedUrls = [
    'https://stream.zeno.fm/yn65fsaurfhvv',
    'https://sv2.globalhostlive.com/proxy/bendistereo/stream2'
    // Adicione outras URLs permitidas aqui
];

// Desabilita a verificação de URLs permitidas
$disableUrlCheck = true; 

// Limite de requisições por segundo por URL
$requestsPerSecondLimit = 5;

// Classe para gerenciar informações do streaming
class StreamManager {
    private $allowedUrls;        // URLs permitidas
    private $historyManager;     // Gerenciador de histórico de músicas
    private $disableUrlCheck;    // Flag para desabilitar a verificação de URL

    public function __construct(array $allowedUrls, bool $disableUrlCheck) {
        $this->allowedUrls = $allowedUrls;
        $this->disableUrlCheck = $disableUrlCheck;
    }

    // Obtém o título da música do streaming
    public function getStreamTitle($streamingUrl, $interval = 19200): ?string {
        $needle = 'StreamTitle=';  // String que indica o início do título da música nos metadados
        $headers = [
            'Icy-MetaData: 1',    // Solicita metadados do streaming
            'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36' // Define um user agent
        ];

        // Cria um contexto de stream com os cabeçalhos e timeout
        $context = stream_context_create([
            'http' => [
                'header' => implode("\r\n", $headers),
                'timeout' => 30 // Tempo limite para a conexão
            ]
        ]);

        // Abre o streaming
        $stream = @fopen($streamingUrl, 'r', false, $context);
        if ($stream === false) {
            return null; // Erro ao abrir o streaming
        }

        // Lê os cabeçalhos para encontrar o intervalo de metadados
        $metaDataInterval = null;
        foreach ($http_response_header as $header) {
            if (stripos($header, 'icy-metaint') !== false) {
                $metaDataInterval = (int)trim(explode(':', $header)[1]);
                break;
            }
        }

        if ($metaDataInterval === null) {
            fclose($stream);
            return null; // Intervalo de metadados não encontrado
        }

        $offset = 0;
        $maxReads = 10; // Limita o número de leituras para evitar loops infinitos
        $readAttempts = 0; // Contador de tentativas de leitura

        // Lê o stream em blocos até encontrar o título da música
        while (!feof($stream) && $maxReads > 0 && $readAttempts < 5) { 
            fread($stream, $metaDataInterval); // Pula o intervalo de metadados
            $buffer = fread($stream, $interval); // Lê um bloco de dados
            $titleIndex = strpos($buffer, $needle); // Procura pelo início do título
            if ($titleIndex !== false) {
                $title = substr($buffer, $titleIndex + strlen($needle));
                $title = substr($title, 0, strpos($title, ';')); // Extrai o título
                fclose($stream);
                return trim($title, "' "); // Remove aspas e espaços extras
            }
            $offset += $metaDataInterval + $interval;
            $maxReads--;
            $readAttempts++;
        }

        fclose($stream);
        return null; // Título não encontrado
    }

    // Extrai o artista e a música do título
    public function extractArtistAndSong($title): array {
        $title = trim($title, "'");
        if (strpos($title, '-') !== false) {
            [$artist, $song] = explode('-', $title, 2);
            return [trim($artist), trim($song)];
        }
        return ['', trim($title)];
    }

    // Obtém a URL da capa do álbum a partir do iTunes
    public function getAlbumArt($artist, $song): ?string {
        $url = 'https://itunes.apple.com/search?term=' . urlencode("$artist $song") . '&media=music&limit=1';
        $response = @file_get_contents($url);
        if ($response === false) {
            return null; // Erro ao obter dados do iTunes
        }

        $data = json_decode($response, true);
        if (!empty($data) && isset($data['resultCount']) && $data['resultCount'] > 0) {
            return str_replace('100x100bb', '512x512bb', $data['results'][0]['artworkUrl100']);
        }
        return null; // Capa não encontrada
    }

    // Atualiza o histórico de músicas
    public function updateHistory($url, $artist, $song): array {
        $this->historyManager = new HistoryManager($url);
        $this->historyManager->addSong($artist, $song);
        return $this->historyManager->getHistory(true);
    }
}

class HistoryManager {
    private $url;            // URL do streaming
    private $historyFile;    // Arquivo JSON para armazenar o histórico
    private $historyLimit = 5; // Limite de músicas no histórico

    public function __construct($url) {
        $this->url = $url;
        $this->historyFile = $this->getHistoryFileName(); // Obtém o nome do arquivo de histórico
    }

    // Obtém o nome do arquivo de histórico com base na URL
    private function getHistoryFileName(): string {
        $historyDir = 'history';  // Diretório para armazenar os históricos
        if (!file_exists($historyDir)) {
            mkdir($historyDir, 0755, true); // Cria o diretório se não existir
        }
        return $historyDir . '/' . hash('sha256', $this->url) . '.json'; 
    }

    // Carrega o histórico do arquivo JSON
    public function loadHistory(): array {
        if (file_exists($this->historyFile)) {
            $history = json_decode(file_get_contents($this->historyFile), true);
            return $history !== null ? $history : []; // Retorna o histórico ou um array vazio se não for válido
        }
        return []; // Retorna um array vazio se o arquivo não existir
    }

    // Salva o histórico no arquivo JSON
    public function saveHistory(array $history): void {
        file_put_contents($this->historyFile, json_encode($history));
    }

    // Adiciona uma música ao histórico
    public function addSong($artist, $song): void {
        $history = $this->loadHistory(); // Carrega o histórico existente
        $currentSong = ["title" => $song, "artist" => $artist]; // Cria um array para a música atual

        // Verifica se a música já está no histórico
        $existingIndex = array_search($currentSong, array_column($history, 'song')); 
        if ($existingIndex !== false) {
            unset($history[$existingIndex]); // Remove a entrada existente para evitar duplicações
        }

        // Adiciona a nova música no início do histórico
        array_unshift($history, ["song" => $currentSong]);

        // Limita o histórico ao número máximo de entradas
        $history = array_slice($history, 0, $this->historyLimit);

        $this->saveHistory($history); // Salva o histórico atualizado
    }

    // Obtém o histórico de músicas, opcionalmente ignorando a primeira entrada
    public function getHistory(bool $ignoreFirst = true): array {
        $history = $this->loadHistory();
        return $ignoreFirst ? array_slice($history, 1) : $history; // Ignora a primeira entrada se $ignoreFirst for true
    }
}


// Define o cabeçalho para indicar que a resposta é JSON
header('Content-Type: application/json');

// Habilita CORS para todas as origens
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS"); 
header("Access-Control-Allow-Headers: Content-Type");

// Trata requisições de preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit; // Não precisa processar mais nada para OPTIONS
}

// Obtém a URL e o intervalo da requisição GET
$url = filter_input(INPUT_GET, 'url', FILTER_VALIDATE_URL);
$interval = filter_input(INPUT_GET, 'interval', FILTER_VALIDATE_INT, ["options" => ["default" => 19200]]);

// Define o formato de saída desejado (true para o novo formato, false para o original)
$outputFormat = true; // Altere para false se quiser o formato original

// Verifica se a URL é válida
if (!filter_var($url, FILTER_VALIDATE_URL)) {
    echo json_encode(["error" => "URL inválida"]);
    exit; // Encerra o script se a URL for inválida
}

// Cria uma instância do StreamManager
$streamManager = new StreamManager($allowedUrls, $disableUrlCheck);

// Obtém o título da música a partir da URL do streaming
$title = $streamManager->getStreamTitle($url, $interval);

// Processa a resposta com base no título obtido
if ($title) {
    [$artist, $song] = $streamManager->extractArtistAndSong($title);
    $artUrl = $streamManager->getAlbumArt($artist, $song);
    $history = $streamManager->updateHistory($url, $artist, $song);

    // Monta a resposta JSON com base no formato definido
    if ($outputFormat) {
        $response = [
            "songtitle" => "$song - $artist",
            "artist" => $artist,
            "song" => $song,
            "source" => $url,
            "artwork" => $artUrl,
            "song_history" => $history
        ];
    } else {
        $response = [
            "currentSong" => $song,
            "currentArtist" => $artist,
            "songHistory" => $history,
            "albumArt" => $artUrl
        ];
    }
} else {
    $response = ["error" => "Falha ao obter o título da transmissão"];
}

echo json_encode($response);
