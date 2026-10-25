package in.agriweather.app;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {
  private final JdbcTemplate db;
  public WeatherController(JdbcTemplate db) { this.db=db; }
  @PostMapping("/save") @ResponseStatus(HttpStatus.CREATED)
  public Map<String,Object> save(@RequestBody Map<String,Object> body, HttpSession session) {
    Object farmerId=session.getAttribute("farmerId"); if(farmerId==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Log in to save weather reports.");
    String location=Objects.toString(body.getOrDefault("location","Unknown location"),"Unknown location");
    if(location.length()>150) location=location.substring(0,150);
    Object current=body.get("current"); Map<?,?> cur=current instanceof Map<?,?> m?m:Map.of();
    BigDecimal temp=number(cur.get("temperature_2m")); Integer humidity=integer(cur.get("relative_humidity_2m")); Integer code=integer(cur.get("weather_code"));
    String json=new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(body).toString();
    db.update("INSERT INTO weather_history(farmer_id,location_name,temperature_c,humidity_percent,weather_code,payload) VALUES(?,?,?,?,?,CAST(? AS JSON))",((Number)farmerId).longValue(),location,temp,humidity,code,json);
    return Map.of("saved",true,"location",location);
  }
  @GetMapping("/history") public List<Map<String,Object>> history(HttpSession session) {
    Object id=session.getAttribute("farmerId"); if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Log in to view saved weather reports.");
    return db.queryForList("SELECT id,location_name,temperature_c,humidity_percent,weather_code,created_at FROM weather_history WHERE farmer_id=? ORDER BY created_at DESC LIMIT 50",((Number)id).longValue());
  }
  private BigDecimal number(Object v) { try{return v==null?null:new BigDecimal(v.toString());}catch(Exception e){return null;} }
  private Integer integer(Object v) { try{return v==null?null:Integer.valueOf(v.toString().split("\\.")[0]);}catch(Exception e){return null;} }
}
