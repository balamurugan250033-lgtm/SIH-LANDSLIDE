from app.services import ingestion


class MockResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


def test_fetches_indianapi_weather_with_expected_contract(monkeypatch):
    captured = {}

    monkeypatch.setattr(ingestion.settings, "IMD_API_KEY", "test-imd-key")
    monkeypatch.setattr(ingestion.settings, "IMD_API_URL", "https://weather.indianapi.in/india/weather")
    monkeypatch.setattr(ingestion, "get_supported_cities", lambda: ["munnar"])

    def mock_get(url, **kwargs):
        captured["url"] = url
        captured.update(kwargs)
        return MockResponse({"weather": {"current": {"rainfall": 18.5}}})

    monkeypatch.setattr(ingestion.requests, "get", mock_get)

    result = ingestion.fetch_imd_rainfall_data("Munnar, Kerala")

    assert result == {"rainfall_mm": 18.5}
    assert captured["params"] == {"city": "Munnar"}
    assert captured["headers"]["x-api-key"] == "test-imd-key"
    assert captured["timeout"] == 10


def test_does_not_create_rainfall_when_provider_omits_measurement(monkeypatch):
    monkeypatch.setattr(ingestion.settings, "IMD_API_KEY", "test-imd-key")
    monkeypatch.setattr(ingestion.settings, "IMD_API_URL", "https://weather.indianapi.in/india/weather")
    monkeypatch.setattr(ingestion, "get_supported_cities", lambda: ["munnar"])
    monkeypatch.setattr(
        ingestion.requests,
        "get",
        lambda *args, **kwargs: MockResponse({"weather": {"current": {"rainfall": None}}}),
    )

    assert ingestion.fetch_imd_rainfall_data("Munnar, Kerala") is None

